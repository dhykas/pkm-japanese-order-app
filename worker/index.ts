/* API + static app in one Worker.
 *   GET  /api/menu      categories and products from Loyverse, cached 5 min (?refresh=1 re-pulls)
 *   POST /api/orders    place an order → becomes a Loyverse receipt
 * Everything else is the React app served from static assets. */
import { Hono } from 'hono';
import type { Bindings } from './env';
import { ConfigError, getMenu } from './menu';
import { checkout } from './checkout';
import { LoyverseError } from './loyverse';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/health', (c) => c.json({ ok: true, time: Date.now() }));

app.get('/api/menu', async (c) => {
  const menu = await getMenu(c.env, c.req.query('refresh') === '1');
  c.header('cache-control', 'no-store');
  return c.json(menu);
});

app.route('/', checkout);

app.onError((err, c) => {
  console.error(err instanceof Error ? err.message : err);
  if (err instanceof ConfigError) return c.json({ error: err.message, code: err.code }, 503);
  if (err instanceof LoyverseError) return c.json({ error: `Loyverse: ${err.message}`, code: 'LOYVERSE' }, 502);
  return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
});

/* Anything that is not /api is the React app. */
app.notFound((c) => (c.req.path.startsWith('/api/') ? c.json({ error: 'Not found' }, 404) : c.env.ASSETS.fetch(c.req.raw)));

export default app;
