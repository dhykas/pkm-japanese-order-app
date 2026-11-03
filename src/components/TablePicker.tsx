import type { Menu } from '../../shared/types';
import { TopBar } from './TopBar';

/* Fallback when the page is opened without ?table=N. Guests normally arrive through the QR code on their table. */
export function TablePicker({ menu }: { menu: Menu }) {
  return (
    <>
      <TopBar name={menu.restaurant.name} />
      <main className="container">
        <section className="hero">
          <span className="pill brand">いらっしゃいませ · Selamat datang</span>
          <h1>{menu.restaurant.name}</h1>
          <p className="lead">Pindai kode QR di meja Anda, atau pilih meja di bawah. Pesanan Anda langsung masuk ke dapur.</p>
        </section>

        <div className="section-title" id="tables">
          <h2>Pilih meja Anda</h2>
          <span className="muted small">Kode QR di setiap meja langsung membuka halamannya.</span>
        </div>
        <div className="grid tables">
          {Array.from({ length: menu.restaurant.tables }, (_, i) => i + 1).map((t) => (
            <a key={t} className="card table-btn" href={`?table=${t}`}>
              Meja {t}
              <span>Pesan di sini</span>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
