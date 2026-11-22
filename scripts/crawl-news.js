// 潍坊理工学院官网「要闻 / 通知」快照。
// 由 GitHub Actions 每 2 小时跑一次，生成 data/news.json，前端直接静态读取。
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const FEEDS = {
  yaowen: 'https://www.wfit.edu.cn/html/cn/xueyuanxinwen/lishanyaowen/',
  tongzhi: 'https://www.wfit.edu.cn/html/cn/xueyuanxinwen/tongzhigonggao/',
};
const OUT = path.join(__dirname, '..', 'data', 'news.json');
const PER_FEED = 12;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36';

function decode(buffer, contentType) {
  const charset = /charset=([\w-]+)/i.exec(contentType || '')?.[1]?.toLowerCase();
  if (charset && /gb|gbk|gb2312/i.test(charset)) return iconv.decode(buffer, 'gbk');
  const utf8 = buffer.toString('utf8');
  return utf8.includes('\uFFFD') ? iconv.decode(buffer, 'gbk') : utf8;
}

function normalizeDate(text) {
  const m = /(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/.exec(text || '');
  if (!m) return '';
  return `${m[1]}-${String(+m[2]).padStart(2, '0')}-${String(+m[3]).padStart(2, '0')}`;
}

function parseList(html, base) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();

  let nodes = $('.se_xuexiao li');
  if (!nodes.length) {
    // 官网栏目改版时的兜底：只要 li 里有日期 + 链接，就当作一条
    nodes = $('li').filter((_, el) => {
      const text = $(el).text();
      return $(el).find('a[href]').length > 0 && /20\d{2}[-/年.]\d{1,2}[-/月.]\d{1,2}/.test(text);
    });
  }

  nodes.each((_, el) => {
    const $el = $(el);
    const date = normalizeDate($el.find('.se_xuexiao_date, strong, .date').first().text() || $el.text());
    if (!date) return;

    let $a = $el.find('.se_xuexiao_con a').first();
    if (!$a.length) $a = $el.find('a[href]').filter((_, a) => {
      const title = ($(a).attr('title') || $(a).text()).trim();
      return title.length >= 4 && !/^(更多|首页|下一页|上一页|尾页|登录|English)$/.test(title);
    }).first();
    if (!$a.length) return;

    const title = ($a.attr('title') || $a.text()).replace(/\s+/g, ' ').trim();
    const href = $a.attr('href') || '';
    if (title.length < 4 || title.length > 90 || !href) return;
    if (!/[\u4e00-\u9fa5]/.test(title)) return;

    const key = title + '|' + date;
    if (seen.has(key)) return;
    seen.add(key);

    let url = href;
    try { url = new URL(href, base).href; } catch { return; }
    items.push({ title, href: url, date });
  });

  return items.slice(0, PER_FEED);
}

async function fetchFeed(url) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        maxRedirects: 5,
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': 'https://www.wfit.edu.cn/',
        },
      });
      const html = decode(Buffer.from(res.data), res.headers['content-type']);
      const items = parseList(html, url);
      if (!items.length) throw new Error('页面没有解析到条目');
      return items;
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1200));
    }
  }
  throw lastError;
}

(async () => {
  const old = (() => {
    try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return null; }
  })();
  const items = {
    yaowen: old?.items?.yaowen || [],
    tongzhi: old?.items?.tongzhi || [],
  };
  const errors = [];

  await Promise.all(Object.entries(FEEDS).map(async ([channel, url]) => {
    try {
      const list = await fetchFeed(url);
      items[channel] = list;
      console.log(`[news] ${channel}: ${list.length} 条`);
    } catch (err) {
      errors.push(`${channel}: ${err.message}`);
      console.error(`[news] ${channel} 失败：${err.message}`);
    }
  }));

  const total = items.yaowen.length + items.tongzhi.length;
  const data = {
    items,
    at: total ? new Date().toISOString() : (old?.at || null),
    stale: errors.length > 0,
    error: errors.join('; ') || undefined,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[news] 写入 ${OUT}：要闻 ${items.yaowen.length}，通知 ${items.tongzhi.length}`);
  if (errors.length === 2) process.exitCode = 0; // 保留上次快照，不让 Actions 因外站抖动变红
})();
