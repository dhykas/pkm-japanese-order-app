import { useEffect, useState } from 'react';
import type { Menu } from '../shared/types';
import { api, ApiRequestError } from './api';
import { configureMoney } from './format';
import { TopBar } from './components/TopBar';
import { TablePicker } from './components/TablePicker';
import { OrderPage } from './components/OrderPage';

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
              <b>The menu could not be loaded</b>
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
          <p className="muted">Loading menu…</p>
        </main>
      </>
    );
  }
  if (table && table <= menu.restaurant.tables) return <OrderPage menu={menu} table={table} />;
  return <TablePicker menu={menu} />;
}

/* Shown until a Loyverse token is configured. Only developers ever see this. */
function SetupCard() {
  return (
    <div className="card pad" style={{ maxWidth: 640, margin: '24px auto' }}>
      <span className="pill brand">Setup</span>
      <h2 style={{ marginTop: 10 }}>Connect Loyverse</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        Categories and products come from your Loyverse account, and every order becomes a Loyverse receipt. The Worker needs an access
        token first.
      </p>
      <ol style={{ margin: '16px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li>
          In Loyverse Back Office open <b>Integrations › Access tokens</b> and create a token.
        </li>
        <li>
          In the project folder open <b>.dev.vars</b> and paste it on the line <code>LOYVERSE_TOKEN=</code>
        </li>
        <li>Reload this page. The dev server picks the file up on its own.</li>
      </ol>
      <p className="muted small" style={{ marginTop: 16 }}>
        Deployed Worker: <code>npx wrangler secret put LOYVERSE_TOKEN</code>.
      </p>
    </div>
  );
}
