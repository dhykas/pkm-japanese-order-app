import { useState } from 'react';
import type { Menu } from '../../shared/types';
import { api } from '../api';

/* Shown when Loyverse answered but returned no product a guest could order. */
export function EmptyMenu({ menu }: { menu: Menu }) {
  const [checking, setChecking] = useState(false);
  const sk = menu.skipped;
  const reasons = [
    sk.variablePrice && `${sk.variablePrice} with a variable price`,
    sk.notForSale && `${sk.notForSale} not available for sale in this store`,
    sk.noPrice && `${sk.noPrice} without a price`,
  ].filter(Boolean) as string[];
  const skippedTotal = sk.variablePrice + sk.notForSale + sk.noPrice;

  const checkAgain = () => {
    setChecking(true);
    api.menu(true).finally(() => window.location.reload());
  };

  return (
    <div className="card pad" style={{ marginTop: 8 }}>
      <span className="pill live">Connected to Loyverse</span>
      <h2 style={{ marginTop: 10 }}>No products to show yet</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        <b>{menu.restaurant.name}</b> has no item with a fixed price that is available for sale.
        {skippedTotal > 0 && ` ${skippedTotal === 1 ? 'One item was' : `${skippedTotal} items were`} left out: ${reasons.join(', ')}.`}
      </p>
      <ol style={{ margin: '16px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li>
          In Loyverse Back Office open <b>Items › Categories</b> and add your categories.
        </li>
        <li>
          Open <b>Items › Item list</b> and add items with a <b>fixed price</b>, each in a category. Photos and descriptions show up here too.
        </li>
        <li>Come back and press the button below.</li>
      </ol>
      <div className="row wrap" style={{ marginTop: 16 }}>
        <button type="button" className="btn primary" onClick={checkAgain} disabled={checking}>
          {checking ? 'Checking…' : 'Check Loyverse again'}
        </button>
        <span className="muted small">Otherwise the menu refreshes on its own every five minutes.</span>
      </div>
    </div>
  );
}
