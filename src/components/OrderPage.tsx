import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Menu, MenuItem, OrderLine, PlacedOrder } from '../../shared/types';
import { lineKey, parseLineKey, resolveOptions } from '../../shared/options';
import { api } from '../api';
import { fmtTime, money } from '../format';
import { TopBar } from './TopBar';
import { MenuGrid } from './MenuGrid';
import { EmptyMenu } from './EmptyMenu';
import { Cart } from './Cart';
import { SentOrders, OrderLines } from './SentOrders';
import { Modal } from './Modal';
import { OptionPicker } from './OptionPicker';

/* Keyed by lineKey: the item id, plus the chosen option ids for items with modifiers. */
type CartState = Record<string, number>;
type CartLine = OrderLine & { key: string };
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
    // drop anything that is no longer on the menu, or whose options changed in Loyverse
    const saved = readJson<CartState>(cartKey, {});
    const byId = new Map(menu.items.map((i) => [i.id, i]));
    const valid: CartState = {};
    for (const [key, qty] of Object.entries(saved)) {
      const { id, options } = parseLineKey(key);
      const item = byId.get(id);
      if (item && qty > 0 && resolveOptions(item, options)) valid[key] = qty;
    }
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
  const [picking, setPicking] = useState<MenuItem | null>(null);
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
    document.title = `Meja ${table} · ${menu.restaurant.name}`;
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

  const addWithOptions = useCallback((item: MenuItem, optionIds: string[], qty: number) => {
    const options = resolveOptions(item, optionIds);
    if (!options) return;
    const key = lineKey(item.id, options);
    setCart((c) => ({ ...c, [key]: Math.min(99, (c[key] ?? 0) + qty) }));
    setPicking(null);
  }, []);
  const closePicker = useCallback(() => setPicking(null), []);

  /* menu.items is sorted by category then name, so the cart and the receipt follow that order */
  const lines = useMemo<CartLine[]>(() => {
    const rank = new Map(menu.items.map((item, i) => [item.id, { item, i }]));
    return Object.entries(cart)
      .flatMap(([key, qty]) => {
        const { id, options: ids } = parseLineKey(key);
        const found = rank.get(id);
        const options = found && resolveOptions(found.item, ids);
        if (!found || !options) return [];
        const { item, i } = found;
        const price = item.price + options.reduce((t, o) => t + o.price, 0);
        const line: CartLine = { key, id, itemId: item.itemId, name: item.name, categoryId: item.categoryId, price, qty, ...(options.length ? { options } : {}) };
        return [{ i, line }];
      })
      .sort((a, b) => a.i - b.i || a.line.key.localeCompare(b.line.key))
      .map((x) => x.line);
  }, [menu.items, cart]);
  /* The menu card shows how many of an item are in the cart, whatever options were chosen. */
  const qtyByItem = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of lines) m[l.id] = (m[l.id] ?? 0) + l.qty;
    return m;
  }, [lines]);
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
        items: lines.map((l) => ({ id: l.id, qty: l.qty, ...(l.options ? { options: l.options.map((o) => o.id) } : {}) })),
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
      <TopBar name={menu.restaurant.name} right={<span className="pill brand">🪑 Meja {table}</span>} />

      <main className="container order-layout">
        <section>
          <div className="page-head">
            <div>
              <h1>
                Menu<span className="jp-title">お品書き</span>
              </h1>
              <p>Meja {table} · pesanan Anda langsung masuk ke dapur</p>
            </div>
          </div>

          {menu.items.length ? (
            <MenuGrid menu={menu} cart={cart} qtyByItem={qtyByItem} setQty={setQty} onChoose={setPicking} activeCat={activeCat} setActiveCat={setActiveCat} query={query} setQuery={setQuery} />
          ) : (
            <EmptyMenu menu={menu} />
          )}

          <div className="section-title" id="myOrders">
            <h2>Pesanan Anda</h2>
            <span className="muted small">dari meja ini</span>
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

      {picking && <OptionPicker item={picking} onAdd={(ids, qty) => addWithOptions(picking, ids, qty)} onClose={closePicker} />}

      {modal?.kind === 'confirm' && (
        <Modal
          title="Konfirmasi pesanan"
          sub={`Meja ${table} · ${count} item`}
          onClose={closeModal}
          dismissable={!placing}
          actions={[
            { label: 'Kembali', cls: 'ghost', disabled: placing, onClick: closeModal },
            { label: placing ? 'Mengirim…' : 'Kirim pesanan', cls: 'primary', disabled: placing, onClick: () => void placeOrder() },
          ]}
        >
          <div className={'field' + (nameError ? ' error' : '')}>
            <label htmlFor="guestName">Nama Anda</label>
            <input
              id="guestName"
              className="input"
              type="text"
              autoComplete="name"
              maxLength={60}
              placeholder="Agar staf bisa menemukan pesanan Anda"
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
            <span className="hint">{nameError ? 'Mohon isi nama Anda' : 'Dicetak di struk dapur bersama nomor meja Anda'}</span>
          </div>
          <OrderLines items={lines} menu={menu} />
          {trimmedNote && <div className="note">📝 {trimmedNote}</div>}
          <div className="sum">
            <div className="total">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>
          <p className="muted small">Dapur langsung mulai menyiapkan pesanan. Pembayaran dilakukan di kasir setelah selesai makan.</p>
        </Modal>
      )}

      {modal?.kind === 'success' && (
        <Modal
          cls="success"
          icon="🍜"
          title="Pesanan diterima!"
          sub={`Struk ${modal.order.receiptNumber} · Meja ${table} · ${fmtTime(modal.order.createdAt)}`}
          onClose={closeModal}
          actions={[
            {
              label: 'Selesai',
              cls: 'primary',
              primary: true,
              onClick: () => {
                closeModal();
                document.getElementById('myOrders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              },
            },
          ]}
        >
          <span className="processing">Dapur sudah menerima pesanan Anda</span>
          <p>
            Terima kasih, <b>{modal.order.customerName}</b>. Sebutkan nomor struk <b>{modal.order.receiptNumber}</b> atau nomor meja Anda di kasir saat membayar.
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
