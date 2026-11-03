/* POST /api/orders: turn a guest's cart into a Loyverse receipt.
 *
 * Loyverse's public API cannot create open tickets, so the order is written as a finished receipt
 * with the configured payment type (LOYVERSE_PAYMENT_TYPE). It shows up in Back Office > Receipts
 * at once. The table number, the guest's name and the kitchen note go into the receipt note. */
import { Hono } from 'hono';
import type { Bindings } from './env.js';
import type { ChosenOption, MenuItem, NewOrderInput, OrderLine, PlacedOrder } from '../shared/types.js';
import { lineKey, resolveOptions } from '../shared/options.js';
import { getLoyverseContext, getMenu, requireToken } from './menu.js';
import { lvPost, type LvReceipt } from './loyverse.js';

export const checkout = new Hono<{ Bindings: Bindings }>();

/* A double tap or a retried request with the same clientOrderId gets the same receipt back. Per isolate. */
const recent = new Map<string, PlacedOrder>();
const round2 = (n: number) => Math.round(n * 100) / 100;

checkout.post('/api/orders', async (c) => {
  const body = await c.req.json<NewOrderInput>().catch(() => null);
  if (!body || typeof body !== 'object') return c.json({ error: 'Isi permintaan harus berupa JSON' }, 400);

  const clientOrderId = typeof body.clientOrderId === 'string' ? body.clientOrderId.slice(0, 64) : '';
  const seen = clientOrderId ? recent.get(clientOrderId) : undefined;
  if (seen) return c.json(seen, 200);

  const menu = await getMenu(c.env);
  const table = Number(body.table);
  if (!Number.isInteger(table) || table < 1 || table > menu.restaurant.tables) {
    return c.json({ error: `Nomor meja harus antara 1 dan ${menu.restaurant.tables}` }, 400);
  }
  const customerName = String(body.customerName ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!customerName) return c.json({ error: 'Mohon isi nama Anda agar staf bisa menemukan pesanan Anda' }, 400);
  if (!Array.isArray(body.items) || body.items.length === 0) return c.json({ error: 'Pesanan belum berisi item' }, 400);

  /* The browser only sends ids, option ids and quantities; names and prices come from the menu snapshot. */
  const index = new Map(menu.items.map((item, i) => [item.id, { item, i }]));
  const merged = new Map<string, { item: MenuItem; i: number; options: ChosenOption[]; qty: number }>();
  for (const line of body.items) {
    const id = String(line?.id ?? '');
    const qty = Math.floor(Number(line?.qty));
    const found = index.get(id);
    if (!found) return c.json({ error: 'Ada item yang sudah tidak tersedia di menu. Muat ulang halaman lalu coba lagi.' }, 400);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) return c.json({ error: 'Jumlah harus antara 1 dan 99' }, 400);
    const options = resolveOptions(found.item, Array.isArray(line.options) ? line.options.map(String) : []);
    if (!options) return c.json({ error: `Mohon pilih opsi untuk ${found.item.name}. Muat ulang halaman jika opsinya berubah.` }, 400);
    const key = lineKey(id, options);
    const prev = merged.get(key);
    merged.set(key, { ...found, options, qty: (prev?.qty ?? 0) + qty });
  }
  /* Menu order is category order, then name. The receipt lines follow it, so the kitchen sees dishes grouped. */
  const items: OrderLine[] = [...merged.values()]
    .sort((a, b) => a.i - b.i)
    .map(({ item, options, qty }) => ({
      id: item.id,
      itemId: item.itemId,
      name: item.name,
      categoryId: item.categoryId,
      price: round2(item.price + options.reduce((t, o) => t + o.price, 0)),
      qty,
      ...(options.length ? { options } : {}),
    }));
  const note = String(body.note ?? '').trim().slice(0, 300);
  const total = round2(items.reduce((t, l) => t + l.price * l.qty, 0));

  const token = requireToken(c.env);
  const ctx = await getLoyverseContext(c.env);
  const reference = `T${table}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const receipt = await lvPost<LvReceipt>(token, 'receipts', {
    store_id: ctx.storeId,
    order: reference,
    source: 'QR table order',
    note: [`Meja ${table}`, customerName, note].filter(Boolean).join(' · '),
    /* price is the item's own price; Loyverse adds the modifier option prices on top. */
    line_items: items.map((l) => {
      const opts = l.options ?? [];
      return {
        variant_id: l.id,
        quantity: l.qty,
        price: round2(l.price - opts.reduce((t, o) => t + o.price, 0)),
        ...(opts.length ? { line_modifiers: opts.map((o) => ({ modifier_option_id: o.id, price: o.price })) } : {}),
      };
    }),
    payments: [{ payment_type_id: ctx.paymentTypeId, money_amount: total }],
  });

  const placed: PlacedOrder = {
    receiptNumber: receipt.receipt_number,
    reference,
    table,
    customerName,
    note,
    items,
    total: typeof receipt.total_money === 'number' ? receipt.total_money : total,
    createdAt: Date.now(),
  };
  if (clientOrderId) {
    recent.set(clientOrderId, placed);
    if (recent.size > 500) {
      const oldest = recent.keys().next().value;
      if (oldest) recent.delete(oldest);
    }
  }
  return c.json(placed, 201);
});
