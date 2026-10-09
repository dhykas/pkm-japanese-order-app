/* POST /api/orders: turn a guest's cart into a Loyverse receipt.
 *
 * Loyverse's public API cannot create open tickets, so the order is written as a finished receipt
 * with the configured payment type (LOYVERSE_PAYMENT_TYPE). It shows up in Back Office > Receipts
 * at once. The table number, the guest's name and the kitchen note go into the receipt note. */
import { Hono } from 'hono';
import type { Bindings } from './env';
import type { NewOrderInput, OrderLine, PlacedOrder } from '../shared/types';
import { getLoyverseContext, getMenu, requireToken } from './menu';
import { lvPost, type LvReceipt } from './loyverse';

export const checkout = new Hono<{ Bindings: Bindings }>();

/* A double tap or a retried request with the same clientOrderId gets the same receipt back. Per isolate. */
const recent = new Map<string, PlacedOrder>();
const round2 = (n: number) => Math.round(n * 100) / 100;

checkout.post('/api/orders', async (c) => {
  const body = await c.req.json<NewOrderInput>().catch(() => null);
  if (!body || typeof body !== 'object') return c.json({ error: 'Body must be JSON' }, 400);

  const clientOrderId = typeof body.clientOrderId === 'string' ? body.clientOrderId.slice(0, 64) : '';
  const seen = clientOrderId ? recent.get(clientOrderId) : undefined;
  if (seen) return c.json(seen, 200);

  const menu = await getMenu(c.env);
  const table = Number(body.table);
  if (!Number.isInteger(table) || table < 1 || table > menu.restaurant.tables) {
    return c.json({ error: `Table must be between 1 and ${menu.restaurant.tables}` }, 400);
  }
  const customerName = String(body.customerName ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!customerName) return c.json({ error: 'Please enter your name so the staff can find your order' }, 400);
  if (!Array.isArray(body.items) || body.items.length === 0) return c.json({ error: 'The order has no items' }, 400);

  /* The browser only sends ids and quantities; names and prices come from the menu snapshot. */
  const index = new Map(menu.items.map((item, i) => [item.id, { item, i }]));
  const merged = new Map<string, number>();
  for (const line of body.items) {
    const id = String(line?.id ?? '');
    const qty = Math.floor(Number(line?.qty));
    if (!index.has(id)) return c.json({ error: 'An item is no longer on the menu. Reload the page and try again.' }, 400);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) return c.json({ error: 'Quantity must be between 1 and 99' }, 400);
    merged.set(id, (merged.get(id) ?? 0) + qty);
  }
  /* Menu order is category order, then name. The receipt lines follow it, so the kitchen sees dishes grouped. */
  const items: OrderLine[] = [...merged]
    .map(([id, qty]) => ({ ...index.get(id)!, qty }))
    .sort((a, b) => a.i - b.i)
    .map(({ item, qty }) => ({ id: item.id, itemId: item.itemId, name: item.name, categoryId: item.categoryId, price: item.price, qty }));
  const note = String(body.note ?? '').trim().slice(0, 300);
  const total = round2(items.reduce((t, l) => t + l.price * l.qty, 0));

  const token = requireToken(c.env);
  const ctx = await getLoyverseContext(c.env);
  const reference = `T${table}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const receipt = await lvPost<LvReceipt>(token, 'receipts', {
    store_id: ctx.storeId,
    order: reference,
    source: 'QR table order',
    note: [`Table ${table}`, customerName, note].filter(Boolean).join(' · '),
    line_items: items.map((l) => ({ variant_id: l.id, quantity: l.qty, price: l.price })),
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
