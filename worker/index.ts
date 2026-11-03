/* The API, served by Vercel Functions (api/[...route].ts) and locally by the Cloudflare dev server.
 *   GET  /api/menu      categories and products from Loyverse, cached 5 min
 *   POST /api/orders    place an order → becomes a Loyverse receipt
 * Everything else is the React app (static files). */
import { Hono } from 'hono';
import type { Bindings } from './env.js';
import { ConfigError, getMenu } from './menu.js';
import { checkout } from './checkout.js';
import { LoyverseError } from './loyverse.js';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/health', (c) => c.json({ ok: true, time: Date.now() }));

app.get('/api/menu', async (c) => {
  const menu = await getMenu(c.env);
  c.header('cache-control', 'no-store');
  return c.json(menu);
});

app.route('/', checkout);

/* Guests get a plain message; the details (store ids, payment type names, Loyverse errors) go to the
 * function log (Vercel dashboard > Logs). Local dev shows the details too, since that is where setup happens. */
app.onError((err, c) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(detail);
  const local = ['localhost', '127.0.0.1'].includes(new URL(c.req.url).hostname);
  const say = (message: string) => (local ? `${message} (${detail})` : message);
  if (err instanceof ConfigError) {
    return c.json({ error: say('Pemesanan online sedang tidak tersedia. Silakan pesan langsung ke staf.'), code: err.code }, 503);
  }
  if (err instanceof LoyverseError) {
    return c.json({ error: say('Sistem restoran tidak merespons. Silakan coba lagi, atau pesan langsung ke staf.'), code: 'LOYVERSE' }, 502);
  }
  return c.json({ error: say('Terjadi kesalahan. Silakan coba lagi.') }, 500);
});

/* Anything that is not /api is the React app (only reached in local dev; Vercel serves the files itself). */
app.notFound((c) => (!c.req.path.startsWith('/api/') && c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.json({ error: 'Tidak ditemukan' }, 404)));

export default app;
