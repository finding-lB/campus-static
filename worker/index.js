// Cloudflare Worker：只代理学习通（*.chaoxing.com）的页面读取。
// 不保存 Cookie、不自动提交作业；Cookie 只随单次请求转发。
const DEFAULT_ORIGIN = '*';
const MAX_COOKIE = 8000;
const MAX_BODY = 32 * 1024;

const corsHeaders = (env) => ({
  'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || DEFAULT_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Token',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
});

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(env) },
  });
}
const ok = (data, env, status = 200) => json({ ok: true, data }, status, env);
const fail = (message, code, env, status = 400) => json({ ok: false, error: { code, message } }, status, env);

function allowedTarget(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase();
  if (host !== 'chaoxing.com' && !host.endsWith('.chaoxing.com')) return null;
  return u;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return ok({ service: 'campus-chaoxing-proxy', ready: true }, env);
    }
    if (request.method !== 'POST' || (url.pathname !== '/fetch' && url.pathname !== '/')) {
      return fail('只支持 POST /fetch', 'method_not_allowed', env, 405);
    }

    if (env.PROXY_TOKEN && request.headers.get('x-proxy-token') !== env.PROXY_TOKEN) {
      return fail('代理口令不对', 'unauthorized', env, 401);
    }

    let body;
    try { body = await request.json(); } catch { return fail('请求体必须是 JSON', 'bad_json', env); }
    const target = allowedTarget(body.url || '');
    if (!target) return fail('只允许 https://*.chaoxing.com 的学习通地址', 'bad_target', env);
    const cookie = String(body.cookie || '').trim();
    if (!cookie || cookie.length < 20) return fail('缺少学习通 Cookie', 'no_cookie', env);
    if (cookie.length > MAX_COOKIE) return fail('Cookie 过长', 'bad_cookie', env);

    const method = String(body.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'POST') return fail('只支持 GET / POST', 'bad_method', env);
    const payload = typeof body.body === 'string' ? body.body : '';
    if (payload.length > MAX_BODY) return fail('请求体过长', 'body_too_large', env);

    let upstream;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), 18000);
    try {
      upstream = await fetch(target.href, {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
          'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Cookie': cookie,
          'Referer': 'https://mooc1.chaoxing.com/',
          ...(method === 'POST' ? { 'Content-Type': body.contentType || 'application/x-www-form-urlencoded' } : {}),
        },
        ...(method === 'POST' ? { body: payload } : {}),
      });
    } catch (err) {
      return fail('上游请求失败：' + (err?.message || 'network error'), 'upstream_network', env, 502);
    } finally {
      clearTimeout(timer);
    }

    const finalUrl = upstream.url || target.href;
    if (upstream.status === 401 || /login|passport|用户登录|请先登录/i.test(finalUrl)) {
      return fail('登录态已失效，请重新复制 Cookie', 'expired', env, 401);
    }
    if (!upstream.ok) return fail('学习通返回 HTTP ' + upstream.status, 'upstream_http', env, 502);

    const text = await upstream.text();
    if (text.length > 2 * 1024 * 1024) return fail('返回内容过大', 'too_large', env, 502);
    return ok({
      status: upstream.status,
      finalUrl,
      contentType: upstream.headers.get('content-type') || 'text/html',
      html: text,
    }, env);
  },
};
