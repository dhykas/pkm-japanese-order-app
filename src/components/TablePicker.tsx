import type { Menu } from '../../shared/types';
import { TopBar } from './TopBar';

/* Fallback when the page is opened without ?table=N. Guests normally arrive through the QR code on their table. */
export function TablePicker({ menu }: { menu: Menu }) {
  return (
    <>
      <TopBar name={menu.restaurant.name} />
      <main className="container">
        <section className="hero">
          <span className="pill brand">いらっしゃいませ · Welcome</span>
          <h1>{menu.restaurant.name}</h1>
          <p className="lead">Scan the QR code on your table, or pick your table below. Your order goes straight to the kitchen.</p>
        </section>

        <div className="section-title" id="tables">
          <h2>Choose your table</h2>
          <span className="muted small">Each table's QR code opens its page directly.</span>
        </div>
        <div className="grid tables">
          {Array.from({ length: menu.restaurant.tables }, (_, i) => i + 1).map((t) => (
            <a key={t} className="card table-btn" href={`?table=${t}`}>
              Table {t}
              <span>Order here</span>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
