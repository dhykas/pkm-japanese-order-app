import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Menu, OrderLine, PlacedOrder } from '../../shared/types';
import { api } from '../api';
import { fmtTime, money, plural } from '../format';
import { TopBar } from './TopBar';
import { MenuGrid } from './MenuGrid';
import { EmptyMenu } from './EmptyMenu';
import { Cart } from './Cart';
import { SentOrders, OrderLines } from './SentOrders';
import { Modal } from './Modal';

type CartState = Record<string, number>;
type ModalState = { kind: 'confirm' } | { kind: 'success'; order: PlacedOrder } | null;

const NAME_KEY = 'guest_name';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: state simply lives in memory */
  }
}

/* One table's ordering screen: menu, cart, name + confirmation, then the order becomes a Loyverse receipt. */
export function OrderPage({ menu, table }: { menu: Menu; table: number }) {
  const cartKey = `cart_table_${table}`;
  const sentKey = `sent_table_${table}`;
  const [cart, setCart] = useState<CartState>(() => {
    // drop anything that is no longer on the menu
    const saved = readJson<CartState>(cartKey, {});
    const valid: CartState = {};
    for (const i of menu.items) if (saved[i.id] > 0) valid[i.id] = saved[i.id];
    return valid;
  });
  const [note, setNote] = useState('');
  const [customerName, setCustomerName] = useState(() => readJson<string>(NAME_KEY, ''));
  const [nameError, setNameError] = useState(false);
  const [activeCat, setActiveCat] = useState('all');
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [sent, setSent] = useState<PlacedOrder[]>(() => readJson<PlacedOrder[]>(sentKey, []));
  const [modal, setModal] = useState<ModalState>(null);
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const clientOrderId = useRef<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    writeJson(cartKey, cart);
    clientOrderId.current = null; // a changed cart is a new order, never a retry of the previous one
  }, [cart, cartKey]);

  useEffect(() => {
    document.body.classList.add('has-cart-bar');
    document.title = `Table ${table} · ${menu.restaurant.name}`;
    return () => document.body.classList.remove('has-cart-bar');
  }, [table, menu.restaurant.name]);

  const setQty = useCallback((id: string, q: number) => {
    setCart((c) => {
      const n = Math.max(0, Math.min(99, Math.floor(q) || 0));
      const next = { ...c };
      if (n > 0) next[id] = n;
      else delete next[id];
      return next;
    });
  }, []);

  /* menu.items is sorted by category then name, so the cart and the receipt follow that order */
  const lines = useMemo<OrderLine[]>(
    () => menu.items.filter((i) => cart[i.id]).map((i) => ({ id: i.id, itemId: i.itemId, name: i.name, categoryId: i.categoryId, price: i.price, qty: cart[i.id] })),
    [menu.items, cart],
  );
  const total = lines.reduce((t, l) => t + l.price * l.qty, 0);
  const count = lines.reduce((t, l) => t + l.qty, 0);

  async function placeOrder() {
    const name = customerName.trim().replace(/\s+/g, ' ');
    if (!name) {
      setNameError(true);
      return;
    }
    if (!lines.length || placing) return;
    setPlacing(true);
    clientOrderId.current ??= crypto.randomUUID();
    try {
      const placed = await api.place({
        table,
        customerName: name,
        items: lines.map((l) => ({ id: l.id, qty: l.qty })),
        note: note.trim(),
        clientOrderId: clientOrderId.current,
      });
      writeJson(NAME_KEY, name);
      const list = [placed, ...sent].slice(0, 20);
      setSent(list);
      writeJson(sentKey, list);
      setCart({});
      setNote('');
      setCartOpen(false);
      setModal({ kind: 'success', order: placed });
    } catch (e) {
      showToast((e as Error).message); // the confirm modal stays open so the guest can try again
    } finally {
      setPlacing(false);
    }
  }

  const closeModal = useCallback(() => setModal(null), []);
  const trimmedNote = note.trim();

  return (
    <>
      <TopBar name={menu.restaurant.name} right={<span className="pill brand">🪑 Table {table}</span>} />

      <main className="container order-layout">
        <section>
          <div className="page-head">
            <div>
              <h1>
                Menu<span className="jp-title">お品書き</span>
              </h1>
              <p>Table {table} · your order goes straight to the kitchen</p>
            </div>
          </div>

          {menu.items.length ? (
            <MenuGrid menu={menu} cart={cart} setQty={setQty} activeCat={activeCat} setActiveCat={setActiveCat} query={query} setQuery={setQuery} />
          ) : (
            <EmptyMenu menu={menu} />
          )}

          <div className="section-title" id="myOrders">
            <h2>Your orders</h2>
            <span className="muted small">from this table</span>
          </div>
          <div className="grid my-orders">
            <SentOrders orders={sent} menu={menu} />
          </div>
        </section>

        <Cart
          lines={lines}
          total={total}
          count={count}
          note={note}
          setNote={setNote}
          setQty={setQty}
          open={cartOpen}
          onOpen={() => setCartOpen(true)}
          onClose={() => setCartOpen(false)}
          onPlace={() => {
            setNameError(false);
            setModal({ kind: 'confirm' });
          }}
          placing={placing}
        />
      </main>

      {modal?.kind === 'confirm' && (
        <Modal
          title="Confirm your order"
          sub={`Table ${table} · ${plural(count, 'item')}`}
          onClose={closeModal}
          dismissable={!placing}
          actions={[
            { label: 'Back', cls: 'ghost', disabled: placing, onClick: closeModal },
            { label: placing ? 'Sending…' : 'Confirm order', cls: 'primary', disabled: placing, onClick: () => void placeOrder() },
          ]}
        >
          <div className={'field' + (nameError ? ' error' : '')}>
            <label htmlFor="guestName">Your name</label>
            <input
              id="guestName"
              className="input"
              type="text"
              autoComplete="name"
              maxLength={60}
              placeholder="So the staff can find your order"
              value={customerName}
              autoFocus={!customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (e.target.value.trim()) setNameError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void placeOrder();
              }}
            />
            <span className="hint">{nameError ? 'Please enter your name' : 'Printed on the kitchen receipt with your table number'}</span>
          </div>
          <OrderLines items={lines} menu={menu} />
          {trimmedNote && <div className="note">📝 {trimmedNote}</div>}
          <div className="sum">
            <div className="total">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>
          <p className="muted small">The kitchen starts right away. You pay at the cashier when you're done.</p>
        </Modal>
      )}

      {modal?.kind === 'success' && (
        <Modal
          cls="success"
          icon="🍜"
          title="Order received!"
          sub={`Receipt ${modal.order.receiptNumber} · Table ${table} · ${fmtTime(modal.order.createdAt)}`}
          onClose={closeModal}
          actions={[
            {
              label: 'Done',
              cls: 'primary',
              primary: true,
              onClick: () => {
                closeModal();
                document.getElementById('myOrders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              },
            },
          ]}
        >
          <span className="processing">The kitchen has your order</span>
          <p>
            Thanks, <b>{modal.order.customerName}</b>. Mention receipt <b>{modal.order.receiptNumber}</b> or your table at the cashier when you pay.
          </p>
          <OrderLines items={modal.order.items} menu={menu} />
        </Modal>
      )}

      <div className={'toast' + (toast ? ' show' : '')} role="status">
        {toast}
      </div>
    </>
  );
}
