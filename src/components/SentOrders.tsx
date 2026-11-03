import type { Menu, OrderLine, PlacedOrder } from '../../shared/types';
import { lineKey, optionsLabel } from '../../shared/options';
import { fmtTime, money, timeAgo } from '../format';

/* Lines are already sorted by category; print a small heading whenever the category changes. */
export function OrderLines({ items, menu }: { items: OrderLine[]; menu: Menu }) {
  const catName = new Map(menu.categories.map((c) => [c.id, c.name]));
  let last = '';
  return (
    <ul>
      {items.map((l) => {
        const heading = l.categoryId !== last ? catName.get(l.categoryId) ?? 'Lainnya' : null;
        last = l.categoryId;
        return (
          <li key={lineKey(l.id, l.options)} style={{ flexWrap: 'wrap' }}>
            {heading && (
              <span className="muted small" style={{ flexBasis: '100%', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 11 }}>
                {heading}
              </span>
            )}
            <span className="q">{l.qty}×</span>
            <span className="n">
              {l.name}
              {l.options?.length ? <span className="opt">{optionsLabel(l.options)}</span> : null}
            </span>
            <span className="a">{money(l.price * l.qty)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* Orders sent from this table on this phone (kept in the browser only). */
export function SentOrders({ orders, menu }: { orders: PlacedOrder[]; menu: Menu }) {
  if (!orders.length) {
    return (
      <div className="empty" style={{ gridColumn: '1 / -1' }}>
        <b>Belum ada pesanan</b>Pesanan yang Anda kirim dari meja ini akan tampil di sini.
      </div>
    );
  }
  return (
    <>
      {orders.map((o) => (
        <div key={o.reference} className="card order">
          <div className="head">
            <div>
              <div className="who">Struk {o.receiptNumber}</div>
              <div className="meta">
                {fmtTime(o.createdAt)} · {timeAgo(o.createdAt)} · {o.customerName}
              </div>
            </div>
            <div className="badges">
              <span className="badge paid">Terkirim ke dapur</span>
            </div>
          </div>
          <OrderLines items={o.items} menu={menu} />
          {o.note && <div className="note">📝 {o.note}</div>}
          <div className="sum">
            <div className="total">
              <span>Total</span>
              <span>{money(o.total)}</span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
