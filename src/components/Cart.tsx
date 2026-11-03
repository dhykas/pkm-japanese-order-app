import type { OrderLine } from '../../shared/types';
import { optionsLabel } from '../../shared/options';
import { money } from '../format';
import { QtyControl } from './QtyControl';

type Line = Pick<OrderLine, 'name' | 'price' | 'qty' | 'options'> & { key: string };

/* Desktop: sticky side panel. Phone: bottom sheet opened from the black cart bar (CSS in styles.css). */
export function Cart(props: {
  lines: Line[];
  total: number;
  count: number;
  note: string;
  setNote: (s: string) => void;
  setQty: (key: string, q: number) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPlace: () => void;
  placing: boolean;
}) {
  const { lines, total, count, note, setNote, setQty, open, onOpen, onClose, onPlace, placing } = props;
  return (
    <>
      <aside className={'card lift cart' + (open ? ' open' : '')} aria-label="Keranjang Anda">
        <div className="cart-head">
          <h2>Keranjang Anda</h2>
          <span className="pill">{count} item</span>
        </div>
        <div className="cart-lines">
          {lines.length ? (
            lines.map((l) => (
              <div className="line" key={l.key}>
                <div>
                  <div className="n">{l.name}</div>
                  {l.options?.length ? <div className="opt">{optionsLabel(l.options)}</div> : null}
                  <div className="sub">{money(l.price)} / item</div>
                </div>
                <QtyControl small qty={l.qty} onChange={(q) => setQty(l.key, q)} />
                <span className="amt">{money(l.price * l.qty)}</span>
              </div>
            ))
          ) : (
            <div className="empty" style={{ padding: '22px 12px' }}>
              <b>Keranjang masih kosong</b>Pilih hidangan lezat dari menu.
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
          placeholder="Catatan untuk dapur (tanpa wasabi, tambah mi…)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="button" className="btn primary lg block" disabled={!lines.length || placing} onClick={onPlace}>
          Pesan sekarang
        </button>
        <button type="button" className="btn ghost block sm only-mobile" onClick={onClose}>
          Tutup
        </button>
      </aside>
      <div className={'backdrop' + (open ? ' show' : '')} onClick={onClose} />
      <button type="button" className="cart-bar" onClick={onOpen}>
        <span>{count ? `${count} item · ${money(total)}` : 'Keranjang kosong'}</span>
        <span>Lihat keranjang ›</span>
      </button>
    </>
  );
}
