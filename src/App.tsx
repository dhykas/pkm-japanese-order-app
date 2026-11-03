import { useEffect, useState } from 'react';
import type { Menu } from '../shared/types';
import { api, ApiRequestError } from './api';
import { configureMoney } from './format';
import { TopBar } from './components/TopBar';
import { TablePicker } from './components/TablePicker';
import { OrderPage } from './components/OrderPage';
import { DiscountPage } from './components/DiscountPage';

/* The QR code on each table links to /?table=N. Without a valid table the picker is shown. */
function tableFromUrl(): number | null {
  const raw = new URLSearchParams(window.location.search).get('table');
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function App() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState<ApiRequestError | Error | null>(null);
  const table = tableFromUrl();

  useEffect(() => {
    api
      .menu()
      .then((m) => {
        configureMoney(m.restaurant.currency, m.restaurant.locale, m.restaurant.decimals);
        document.title = m.restaurant.name;
        setMenu(m);
      })
      .catch((e: Error) => setError(e));
  }, []);

  if (error) {
    const code = error instanceof ApiRequestError ? error.code : undefined;
    return (
      <>
        <TopBar name="Menu" />
        <main className="container">
          {code === 'NO_TOKEN' ? (
            <SetupCard />
          ) : (
            <div className="empty">
              <b>Menu tidak dapat dimuat</b>
              {error.message}
            </div>
          )}
        </main>
      </>
    );
  }
  if (!menu) {
    return (
      <>
        <TopBar name="…" />
        <main className="container">
          <p className="muted">Memuat menu…</p>
        </main>
      </>
    );
  }
  /* /discount is the staff discount calculator; everything else is the guest ordering app. */
  if (window.location.pathname.replace(/\/+$/, '') === '/discount') return <DiscountPage menu={menu} />;
  if (table && table <= menu.restaurant.tables) return <OrderPage menu={menu} table={table} />;
  return <TablePicker menu={menu} />;
}

/* Shown until a Loyverse token is configured. Only developers ever see this. */
function SetupCard() {
  return (
    <div className="card pad" style={{ maxWidth: 640, margin: '24px auto' }}>
      <span className="pill brand">Pengaturan</span>
      <h2 style={{ marginTop: 10 }}>Hubungkan Loyverse</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        Kategori dan produk diambil dari akun Loyverse Anda, dan setiap pesanan menjadi struk Loyverse. Worker membutuhkan
        token akses terlebih dahulu.
      </p>
      <ol style={{ margin: '16px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li>
          Di Loyverse Back Office buka <b>Integrations › Access tokens</b> lalu buat token.
        </li>
        <li>
          Di folder proyek buka <b>.dev.vars</b> lalu tempel token pada baris <code>LOYVERSE_TOKEN=</code>
        </li>
        <li>Muat ulang halaman ini. Server dev membaca file itu dengan sendirinya.</li>
      </ol>
      <p className="muted small" style={{ marginTop: 16 }}>
        Di Vercel: <code>npx vercel env add LOYVERSE_TOKEN production</code>, lalu deploy ulang.
      </p>
    </div>
  );
}
