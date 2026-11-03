import { useEffect, useMemo, useState } from 'react';
import type { Menu } from '../../shared/types';
import { money } from '../format';
import { TopBar } from './TopBar';
import { QtyControl } from './QtyControl';

/* /discount: pick menu items and how many of each, set a discount rate (one for all, or per item) and see the new prices.
 * It only calculates. Nothing is written to Loyverse and the guest menu keeps its normal prices. */

const STORE_KEY = 'discount_calc';
type Saved = { rate: string; step: number; picked: Record<string, string>; counts?: Record<string, number> };

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {
    /* storage blocked or bad JSON: start fresh */
  }
  return { rate: '10', step: 0, picked: {} };
}

const clampRate = (v: string, fallback: number) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(n) ? fallback : Math.min(100, Math.max(0, n));
};
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

export function DiscountPage({ menu }: { menu: Menu }) {
  const [saved] = useState(load);
  const [rate, setRate] = useState(saved.rate);
  const [step, setStep] = useState(saved.step);
  /* item id -> its own rate as typed; '' means "use the default rate" */
  const [picked, setPicked] = useState<Record<string, string>>(saved.picked);
  /* item id -> how many; missing means 1 */
  const [counts, setCounts] = useState<Record<string, number>>(saved.counts ?? {});
  const [cat, setCat] = useState('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = `Kalkulator diskon · ${menu.restaurant.name}`;
  }, [menu.restaurant.name]);
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ rate, step, picked, counts }));
    } catch {
      /* not saved; the page still works */
    }
  }, [rate, step, picked, counts]);

  const defaultRate = clampRate(rate, 0);
  const unit = 10 ** -menu.restaurant.decimals;
  const roundTo = step || unit;
  const discounted = (price: number, r: number) => Math.max(0, Math.round((price * (1 - r / 100)) / roundTo) * roundTo);
  const catName = useMemo(() => new Map(menu.categories.map((c) => [c.id, c.name])), [menu.categories]);
  const shown = menu.items.filter((i) => cat === 'all' || i.categoryId === cat);

  const rows = menu.items
    .filter((i) => i.id in picked)
    .map((i) => {
      const r = clampRate(picked[i.id], defaultRate);
      const after = discounted(i.price, r);
      return { item: i, rate: r, after, qty: counts[i.id] ?? 1 };
    });
  const before = rows.reduce((t, x) => t + x.item.price * x.qty, 0);
  const after = rows.reduce((t, x) => t + x.after * x.qty, 0);
  const totalQty = rows.reduce((t, x) => t + x.qty, 0);
  const setCount = (id: string, n: number) => setCounts((c) => ({ ...c, [id]: Math.max(1, Math.min(99, n)) }));

  const toggle = (id: string) =>
    setPicked((p) => {
      const next = { ...p };
      if (id in next) delete next[id];
      else next[id] = '';
      return next;
    });
  const pickShown = () => setPicked((p) => Object.fromEntries([...Object.entries(p), ...shown.filter((i) => !(i.id in p)).map((i) => [i.id, ''])]));
  const clearShown = () => setPicked((p) => Object.fromEntries(Object.entries(p).filter(([id]) => !shown.some((i) => i.id === id))));

  async function copyList() {
    const text = [
      ...rows.map((x) => `${x.qty}× ${x.item.name}: ${money(x.item.price)} → ${money(x.after)} (-${pct(x.rate)}) = ${money(x.after * x.qty)}`),
      '',
      `Harga normal: ${money(before)}`,
      `Setelah diskon: ${money(after)}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Salin daftar ini:', text);
    }
  }

  return (
    <>
      <TopBar name={menu.restaurant.name} right={<span className="pill brand">Kalkulator diskon</span>} />
      <main className="container disc-layout">
        <section>
          <div className="page-head">
            <div>
              <h1>Kalkulator diskon</h1>
              <p>Pilih menu dan persentase diskon untuk melihat harga barunya. Halaman ini hanya menghitung: harga di Loyverse dan di menu tamu tetap normal.</p>
            </div>
          </div>

          <div className="card pad disc-controls">
            <div className="field">
              <label htmlFor="discRate">Diskon untuk semua item yang dipilih</label>
              <div className="row">
                <input id="discRate" className="input disc-rate" type="number" inputMode="decimal" min={0} max={100} step="any" value={rate} onChange={(e) => setRate(e.target.value)} />
                <span>%</span>
              </div>
              <span className="hint">Isi persentase lain pada sebuah item untuk menggantinya khusus item itu.</span>
            </div>
            {menu.restaurant.decimals === 0 && (
              <div className="field">
                <label htmlFor="discStep">Bulatkan harga baru</label>
                <select id="discStep" className="input" value={step} onChange={(e) => setStep(Number(e.target.value))}>
                  <option value={0}>Tanpa pembulatan</option>
                  <option value={100}>Ke kelipatan {money(100)} terdekat</option>
                  <option value={500}>Ke kelipatan {money(500)} terdekat</option>
                  <option value={1000}>Ke kelipatan {money(1000)} terdekat</option>
                </select>
              </div>
            )}
          </div>

          <div className="menu-tools">
            <div className="chips">
              <button type="button" className={'chip' + (cat === 'all' ? ' active' : '')} onClick={() => setCat('all')}>
                Semua
              </button>
              {menu.categories.map((c) => (
                <button key={c.id} type="button" className={'chip' + (cat === c.id ? ' active' : '')} onClick={() => setCat(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
            <div className="row">
              <button type="button" className="btn sm" onClick={pickShown}>
                Pilih semua {cat === 'all' ? '' : catName.get(cat)}
              </button>
              <button type="button" className="btn sm ghost" onClick={clearShown}>
                Kosongkan {cat === 'all' ? 'semua' : catName.get(cat)}
              </button>
            </div>
          </div>

          <div className="disc-list">
            {shown.length ? (
              shown.map((i) => {
                const on = i.id in picked;
                const r = on ? clampRate(picked[i.id], defaultRate) : defaultRate;
                const newPrice = discounted(i.price, r);
                return (
                  <div key={i.id} className={'card disc-row' + (on ? ' on' : '')}>
                    <label className="disc-pick">
                      <input type="checkbox" checked={on} onChange={() => toggle(i.id)} />
                      <span>
                        <b>{i.name}</b>
                        <span className="muted small">
                          {catName.get(i.categoryId) ?? 'Lainnya'} · {money(i.price)}
                        </span>
                      </span>
                    </label>
                    {on && (
                      <div className="disc-calc">
                        <QtyControl small qty={counts[i.id] ?? 1} onChange={(n) => setCount(i.id, n)} />
                        <span className="row">
                          <input
                            className="input disc-rate sm"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step="any"
                            placeholder={String(defaultRate)}
                            aria-label={`Diskon untuk ${i.name}`}
                            value={picked[i.id]}
                            onChange={(e) => setPicked((p) => ({ ...p, [i.id]: e.target.value }))}
                          />
                          <span>%</span>
                        </span>
                        <span className="disc-price">
                          <s className="muted small">{money(i.price)}</s>
                          <b>{money(newPrice)}</b>
                          {(counts[i.id] ?? 1) > 1 && <span className="muted small">= {money(newPrice * (counts[i.id] ?? 1))}</span>}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="empty">
                <b>Belum ada menu</b>Tambahkan item dengan harga tetap di Loyverse terlebih dahulu.
              </div>
            )}
          </div>
        </section>

        <aside className="card lift pad disc-summary" aria-label="Ringkasan">
          <h2>Ringkasan</h2>
          {rows.length ? (
            <>
              <ul className="disc-sum-lines">
                {rows.map((x) => (
                  <li key={x.item.id}>
                    <span>
                      {x.qty}× {x.item.name}
                    </span>
                    <span className="muted small">-{pct(x.rate)}</span>
                    <b>{money(x.after * x.qty)}</b>
                  </li>
                ))}
              </ul>
              <div className="sum">
                <div>
                  <span>Harga normal</span>
                  <span>{money(before)}</span>
                </div>
                <div className="disc">
                  <span>Diskon</span>
                  <span>
                    -{money(before - after)} ({pct(before ? ((before - after) / before) * 100 : 0)})
                  </span>
                </div>
                <div className="total">
                  <span>Setelah diskon</span>
                  <span>{money(after)}</span>
                </div>
              </div>
              <p className="muted small">
                {totalQty} item ({rows.length} menu)
              </p>
              <button type="button" className="btn primary block" onClick={() => void copyList()}>
                {copied ? 'Tersalin ✓' : 'Salin daftar harga'}
              </button>
            </>
          ) : (
            <div className="empty" style={{ padding: '22px 12px' }}>
              <b>Belum ada yang dipilih</b>Centang item yang ingin didiskon.
            </div>
          )}
        </aside>
      </main>
    </>
  );
}
