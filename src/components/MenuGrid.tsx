import type { Menu, MenuItem } from '../../shared/types';
import { money } from '../format';
import { QtyControl } from './QtyControl';

/* Loyverse item colours, used as the tile background when an item has no photo. */
const COLORS: Record<string, string> = {
  GREY: '#9ca3af', RED: '#ef4444', PINK: '#ec4899', ORANGE: '#f97316', YELLOW: '#eab308', GREEN: '#22c55e', BLUE: '#3b82f6', PURPLE: '#a855f7',
};

export function MenuGrid(props: {
  menu: Menu;
  cart: Record<string, number>;
  setQty: (id: string, q: number) => void;
  activeCat: string;
  setActiveCat: (id: string) => void;
  query: string;
  setQuery: (q: string) => void;
}) {
  const { menu, cart, setQty, activeCat, setActiveCat, query, setQuery } = props;
  const q = query.trim().toLowerCase();
  const list = menu.items.filter(
    (i) => (activeCat === 'all' || i.categoryId === activeCat) && (!q || `${i.name} ${i.sku ?? ''} ${i.description ?? ''}`.toLowerCase().includes(q)),
  );

  return (
    <>
      <div className="menu-tools">
        <div className="search">
          <input className="input" type="search" placeholder="Search the menu…" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="chips">
          <button type="button" className={'chip' + (activeCat === 'all' ? ' active' : '')} onClick={() => setActiveCat('all')}>
            All
          </button>
          {menu.categories.map((c) => (
            <button key={c.id} type="button" className={'chip' + (activeCat === c.id ? ' active' : '')} onClick={() => setActiveCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid menu">
        {list.length ? (
          list.map((i) => <ItemCard key={i.id} item={i} qty={cart[i.id] ?? 0} setQty={(n) => setQty(i.id, n)} />)
        ) : (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
            <b>Nothing found</b>Try another word or category.
          </div>
        )}
      </div>
    </>
  );
}

function ItemCard({ item, qty, setQty }: { item: MenuItem; qty: number; setQty: (n: number) => void }) {
  return (
    <div className={'card item' + (qty ? ' in-cart' : '')}>
      <div className="tile">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="initial" style={{ background: COLORS[item.color ?? ''] ?? '#9ca3af' }}>
            {item.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="name">{item.name}</div>
      <div className="desc">{item.description ?? ''}</div>
      <div className="foot">
        <span className="price">{money(item.price)}</span>
        {qty ? (
          <QtyControl qty={qty} onChange={setQty} />
        ) : (
          <button type="button" className="btn sm" onClick={() => setQty(1)}>
            + Add
          </button>
        )}
      </div>
    </div>
  );
}
