/* Loyverse Explorer — Worker
 *
 * Serves the static page from ./public and proxies GET /api/<resource> to
 * https://api.loyverse.com/v1.0/<resource>. The browser cannot call Loyverse
 * directly (no CORS headers), so the token travels page → this Worker → Loyverse.
 *
 * Read-only on purpose: anything but GET is refused, so a mistake here can never
 * create receipts or change items. The token is never logged or stored.
 *
 * CORS: a page served from another localhost port (VS Code Live Server on 5500,
 * for example) may call this Worker. Non-local origins get no CORS headers.
 */
const UPSTREAM = 'https://api.loyverse.com/v1.0/';
const PATH_OK = /^[a-z_]+(\/[A-Za-z0-9_.-]+)?$/;   // "items" or "items/<id>", nothing else
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return proxy(request, url);
    return env.ASSETS.fetch(request);
  }
};

async function proxy(request, url) {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'GET') {
    return json({ errors: [{ code: 'READ_ONLY', details: 'This explorer only forwards GET requests.' }] }, 405, cors);
  }
  const token = request.headers.get('X-Loyverse-Token');
  if (!token) {
    return json({ errors: [{ code: 'NO_TOKEN', details: 'Missing X-Loyverse-Token header.' }] }, 400, cors);
  }
  const path = url.pathname.slice('/api/'.length);
  if (!PATH_OK.test(path)) {
    return json({ errors: [{ code: 'BAD_PATH', details: 'Only /api/<resource> or /api/<resource>/<id> is allowed.' }] }, 400, cors);
  }

  let upstream;
  try {
    upstream = await fetch(UPSTREAM + path + url.search, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
    });
  } catch (e) {
    return json({ errors: [{ code: 'UPSTREAM_UNREACHABLE', details: String(e && e.message || e) }] }, 502, cors);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: Object.assign({
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store'
    }, cors)
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  if (!origin || !LOCAL_ORIGIN.test(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'X-Loyverse-Token',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  };
}

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'content-type': 'application/json', 'cache-control': 'no-store' }, extra || {})
  });
}
