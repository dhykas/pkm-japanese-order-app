import type { OrderLine } from '../../shared/types';
import { money, plural } from '../format';
import { QtyControl } from './QtyControl';

type Line = Pick<OrderLine, 'id' | 'name' | 'price' | 'qty'>;

/* Desktop: sticky side panel. Phone: bottom sheet opened from the black cart bar (CSS in styles.css). */
export function Cart(props: {
  lines: Line[];
  total: number;
  count: number;
  note: string;
  setNote: (s: string) => void;
  setQty: (id: string, q: number) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPlace: () => void;
  placing: boolean;
}) {
  const { lines, total, count, note, setNote, setQty, open, onOpen, onClose, onPlace, placing } = props;
  return (
    <>
      <aside className={'card lift cart' + (open ? ' open' : '')} aria-label="Your cart">
        <div className="cart-head">
          <h2>Your cart</h2>
          <span className="pill">{plural(count, 'item')}</span>
        </div>
        <div className="cart-lines">
          {lines.length ? (
            lines.map((l) => (
              <div className="line" key={l.id}>
                <div>
                  <div className="n">{l.name}</div>
                  <div className="sub">{money(l.price)} each</div>
                </div>
                <QtyControl small qty={l.qty} onChange={(q) => setQty(l.id, q)} />
                <span className="amt">{money(l.price * l.qty)}</span>
              </div>
            ))
          ) : (
            <div className="empty" style={{ padding: '22px 12px' }}>
              <b>Your cart is empty</b>Add something tasty from the menu.
            </div>
          )}
        </div>
        <div className="sum">
          <div className="total">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>
        <textarea
          className="input"
          rows={2}
          maxLength={300}
          placeholder="Note for the kitchen (no wasabi, extra noodles…)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="button" className="btn primary lg block" disabled={!lines.length || placing} onClick={onPlace}>
          Place order
        </button>
        <button type="button" className="btn ghost block sm only-mobile" onClick={onClose}>
          Close
        </button>
      </aside>
      <div className={'backdrop' + (open ? ' show' : '')} onClick={onClose} />
      <button type="button" className="cart-bar" onClick={onOpen}>
        <span>{count ? `${plural(count, 'item')} · ${money(total)}` : 'Cart empty'}</span>
        <span>View cart ›</span>
      </button>
    </>
  );
}
