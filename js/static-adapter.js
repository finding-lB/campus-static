// 静态版适配层：把旧本地 Node API 变成浏览器里的 localStorage + 静态 JSON + Worker。
// 必须在 app.js 之前加载。只接管 /api/*，其它请求原样交给浏览器。
(() => {
  'use strict';

  // 部署 Cloudflare Worker 后，把这里替换成你的地址，例如：
  // const WORKER_URL = 'https://campus-proxy.example.workers.dev';
  // 运行时读取 index.html / app.js 设置的全局值，两边填一处即可。
  const workerUrl = () => window.CAMPUS_WORKER_URL || '';
  const proxyToken = () => window.CAMPUS_PROXY_TOKEN || '';

  const STATE_KEY = 'campusLife.v3';
  const COOKIE_KEY = 'campus.cx.cookie.v1';
  const SYNC_KEY = 'campus.cx.lastSync.v1';
  const NEWS_KEY = 'campusNews';
  const nativeFetch = window.fetch.bind(window);

  const readJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };
  const writeJson = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 隐私模式忽略 */ }
  };
  const ok = (data) => new Response(JSON.stringify({ ok: true, data }), {
    status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
  const fail = (message, code = 'error') => new Response(JSON.stringify({
    ok: false, error: { code, message },
  }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  const blankState = () => ({ courses: [], tasks: [], expenses: [], gpa: [], kv: {} });

  /** 兼容旧 SQLite 导出的 {data:{...}}、{settings,foods} 和页面自己导出的扁平结构。 */
  function normalizePayload(raw) {
    const d = raw && raw.data && typeof raw.data === 'object' ? raw.data : (raw || {});
    const sourceKv = d.kv && typeof d.kv === 'object' ? d.kv : (d.settings && typeof d.settings === 'object' ? d.settings : {});
    const kv = { ...sourceKv };
    if (Array.isArray(d.foods) && d.foods.length) {
      kv.food = d.foods.map((f) => (typeof f === 'string' ? f : f?.name)).filter(Boolean).slice(0, 24);
    }
    if (Array.isArray(kv.billRef)) {
      kv.billRef = kv.billRef.map((r) => ({
        month: r.month || r.ym || '',
        src: r.src || r.channel || '',
        total: Number(r.total ?? r.amount),
      })).filter((r) => r.month && r.src && Number.isFinite(r.total)).slice(0, 12);
    }
    return {
      courses: Array.isArray(d.courses) ? d.courses : [],
      tasks: Array.isArray(d.tasks) ? d.tasks : [],
      expenses: Array.isArray(d.expenses) ? d.expenses : [],
      gpa: Array.isArray(d.gpa) ? d.gpa : [],
      kv,
    };
  }

  const readState = () => {
    const s = readJson(STATE_KEY, null);
    if (!s || typeof s !== 'object') return blankState();
    return normalizePayload(s);
  };
  const writeState = (s) => writeJson(STATE_KEY, s);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (m) => `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  const uid = () => 'cx' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

  function cookieInfo() {
    const stored = readJson(COOKIE_KEY, null);
    const last = readJson(SYNC_KEY, null);
    return {
      hasCookie: !!(stored && stored.cookie),
      savedAt: stored?.at || null,
      masked: stored?.cookie
        ? stored.cookie.split(';').slice(0, 2).map((p) => p.split('=')[0] + '=***').join('; ')
        : '',
      lastSync: last ? { finished_at: last } : null,
    };
  }

  /** 兼容学习通常见的 JSON 结构：数组，或 {data:[...]} / {list:[...]}。 */
  function parseChaoxingJson(text) {
    let root;
    try { root = JSON.parse(text); } catch { return []; }
    const out = [];
    const seen = new Set();
    const walk = (obj, depth = 0) => {
      if (!obj || depth > 5 || out.length >= 80) return;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (!item || typeof item !== 'object') continue;
          const title = item.title || item.name || item.workName || item.examName;
          const rawDue = item.endTime || item.deadline || item.endDate || item.expireTime;
          if (!title || !rawDue) continue;
          const date = new Date(typeof rawDue === 'number' ? rawDue : String(rawDue).replace(/\//g, '-'));
          if (isNaN(date)) continue;
          const due = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
          const k = title + '|' + due;
          if (seen.has(k)) continue;
          seen.add(k);
          out.push({
            title: String(title).slice(0, 80), due, course: String(item.courseName || item.course || ''),
            done: !!(item.done || item.status === 1 || /已提交|已完成/.test(String(item.statusText || ''))),
            source: 'chaoxing', externalId: `${title}|${due}`,
          });
        }
      } else if (typeof obj === 'object') {
        for (const key of ['data', 'list', 'items', 'works', 'exams', 'result']) {
          if (obj[key]) walk(obj[key], depth + 1);
        }
      }
    };
    walk(root);
    return out;
  }

  /** 从 Worker 返回的学习通 HTML 里抽作业/考试条目；不做任何写库动作。 */
  function parseChaoxingHtml(html, baseUrl) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const out = [];
    const seen = new Set();
    const skip = /^(首页|登录|退出|返回|更多|上一页|下一页|帮助|客服|课程|消息|通知|作业|考试)$/;

    for (const a of doc.querySelectorAll('a[href]')) {
      const title = (a.getAttribute('title') || a.textContent || '').replace(/\s+/g, ' ').trim();
      if (title.length < 3 || title.length > 90 || skip.test(title)) continue;
      const box = a.closest('li,tr,article,.work-item,.task-item,.list-item') || a.parentElement?.parentElement || a.parentElement;
      if (!box) continue;
      const context = (box.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      const dates = [...context.matchAll(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})(?:日)?(?:\s*(\d{1,2}):(\d{2}))?/g)];
      if (!dates.length) continue;
      const due = isoDate(dates[0]);
      const key = title + '|' + due;
      if (seen.has(key)) continue;
      seen.add(key);
      const statusText = context;
      const done = /已批阅|已评分|已完成/.test(statusText);
      let href = '';
      try { href = new URL(a.getAttribute('href'), baseUrl || location.href).href; } catch { /* 相对地址异常忽略 */ }
      out.push({
        title: title.slice(0, 80),
        due,
        course: '',
        done,
        source: 'chaoxing',
        externalId: `${title.slice(0, 60)}|${due}`,
        href,
      });
      if (out.length >= 80) break;
    }
    return out;
  }

  async function proxyChaoxing(url) {
    if (!workerUrl()) throw new Error('还没有配置 WORKER_URL，请先部署 Worker 并填写地址');
    const stored = readJson(COOKIE_KEY, null);
    if (!stored?.cookie) throw new Error('还没连接学习通：先粘贴 Cookie');
    if (!/^https?:\/\//i.test(url)) throw new Error('请填写学习通作业/考试列表页的地址');

    const res = await nativeFetch(workerUrl().replace(/\/$/, '') + '/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(proxyToken() ? { 'X-Proxy-Token': proxyToken() } : {}),
      },
      body: JSON.stringify({ url, cookie: stored.cookie, method: 'GET' }),
    });
    let body;
    try { body = await res.json(); } catch { throw new Error('Worker 返回的不是 JSON'); }
    if (!body.ok) throw new Error(body.error?.message || `Worker 返回 HTTP ${res.status}`);
    const d = body.data || {};
    const raw = d.html || d.text || '';
    let items = [];
    if (/json/i.test(d.contentType || '')) items = parseChaoxingJson(raw);
    if (!items.length) items = parseChaoxingHtml(raw, d.finalUrl || url);
    if (!items.length) throw new Error('这个页面没解析到作业/考试条目，请换用「粘贴导入」');
    writeJson(SYNC_KEY, new Date().toISOString());
    return { items, sourceUrl: d.finalUrl || url, fetchedAt: new Date().toISOString() };
  }

  function importChaoxing(items) {
    const s = readState();
    let added = 0, updated = 0, skipped = 0;
    for (const it of Array.isArray(items) ? items : []) {
      if (!it || !it.title || !it.due) { skipped++; continue; }
      const ext = it.externalId || `${it.course || ''}|${it.title}|${it.due}`;
      const old = s.tasks.find((t) => (t.externalId && t.externalId === ext) || (t.title === it.title && t.due === it.due));
      if (old) {
        const nextDone = !!it.done;
        if (old.done !== nextDone) { old.done = nextDone; updated++; } else skipped++;
        continue;
      }
      s.tasks.push({
        id: uid(), title: it.title, course: it.course || '', due: it.due,
        prio: 'normal', done: !!it.done, source: 'chaoxing', externalId: ext,
      });
      added++;
    }
    writeState(s);
    writeJson(SYNC_KEY, new Date().toISOString());
    return { added, updated, skipped };
  }

  async function library() {
    const sizes = { 'hello-algo-zh-python.pdf': 16176086, 'progit-zh.pdf': 20131502 };
    try {
      const res = await nativeFetch('./library/manifest.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const list = await res.json();
      const files = (Array.isArray(list) ? list : []).map((f) => ({
        ...f,
        url: './library/' + encodeURIComponent(f.file),
        size: sizes[f.file] || 0,
        exists: true,
      }));
      return { files, total: files.length };
    } catch {
      return { files: [], total: 0, error: true };
    }
  }

  async function news() {
    try {
      const res = await nativeFetch('./data/news.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data.items) throw new Error('news.json 格式不对');
      writeJson(NEWS_KEY, { items: data.items, at: data.at });
      return data;
    } catch (e) {
      const cached = readJson(NEWS_KEY, null);
      if (cached) return { items: cached.items, at: cached.at, stale: true, error: e.message };
      return { items: { yaowen: [], tongzhi: [] }, at: null, stale: true, error: e.message };
    }
  }

  window.fetch = async function campusStaticFetch(input, init = {}) {
    const rawUrl = typeof input === 'string' ? input : input.url;
    let parsed;
    try { parsed = new URL(rawUrl, location.href); } catch { return nativeFetch(input, init); }
    const path = parsed.pathname;
    if (!path.startsWith('/api/')) return nativeFetch(input, init);

    const method = (init.method || (typeof input === 'object' ? input.method : '') || 'GET').toUpperCase();
    let body = {};
    if (init.body) {
      try { body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body; } catch { body = {}; }
    }

    if (path === '/api/state' && method === 'GET') return ok(readState());
    if (path === '/api/state' && method === 'PUT') {
      const s = body && typeof body === 'object' ? body : {};
      writeState({ ...blankState(), ...s });
      return ok(true);
    }
    if (path === '/api/state' && method === 'DELETE') {
      writeState(blankState());
      return ok(true);
    }
    if (path === '/api/migrate/legacy' && method === 'POST') {
      const s = body.data || body;
      writeState(normalizePayload(s));
      return ok(true);
    }
    if (path === '/api/news' && method === 'GET') return ok(await news());
    if (path === '/api/library' && method === 'GET') return ok(await library());
    if (path === '/api/net' && method === 'GET') {
      return ok({ urls: [], port: 8787, publicUrl: location.href.split('?')[0], static: true });
    }
    if (path === '/api/backup' && method === 'GET') {
      const s = readState();
      return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), ...s }, null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    if (path === '/api/restore' && method === 'POST') {
      writeState(normalizePayload(body));
      return ok(true);
    }
    if (path === '/api/chaoxing/status' && method === 'GET') return ok(cookieInfo());
    if (path === '/api/chaoxing/cookie' && method === 'POST') {
      const value = String(body.cookie || '').trim();
      if (value.length < 20 || !/[=;]/.test(value)) return fail('Cookie 太短或格式不对，应形如 name=value; name2=value2', 'bad_cookie');
      if (value.length > 8000) return fail('Cookie 过长', 'bad_cookie');
      writeJson(COOKIE_KEY, { cookie: value, at: new Date().toISOString() });
      return ok(cookieInfo());
    }
    if (path === '/api/chaoxing/cookie' && method === 'DELETE') {
      try { localStorage.removeItem(COOKIE_KEY); } catch { /* ignore */ }
      return ok(cookieInfo());
    }
    if (path === '/api/chaoxing/sync' && method === 'POST') {
      try { return ok(await proxyChaoxing(String(body.url || '').trim())); }
      catch (e) { return fail(e.message, 'sync_failed'); }
    }
    if (path === '/api/chaoxing/import' && method === 'POST') {
      if (!Array.isArray(body.items)) return fail('items 必须是数组', 'bad_shape');
      return ok(importChaoxing(body.items));
    }
    return fail('静态版没有这个接口：' + path, 'not_found');
  };
})();
