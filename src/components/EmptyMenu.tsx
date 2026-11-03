import type { Menu } from '../../shared/types';

/* Shown when Loyverse answered but returned no product a guest could order. */
export function EmptyMenu({ menu }: { menu: Menu }) {
  const sk = menu.skipped;
  const reasons = [
    sk.variablePrice && `${sk.variablePrice} dengan harga variabel`,
    sk.notForSale && `${sk.notForSale} tidak dijual di toko ini`,
    sk.noPrice && `${sk.noPrice} tanpa harga`,
  ].filter(Boolean) as string[];
  const skippedTotal = sk.variablePrice + sk.notForSale + sk.noPrice;

  return (
    <div className="card pad" style={{ marginTop: 8 }}>
      <span className="pill live">Terhubung ke Loyverse</span>
      <h2 style={{ marginTop: 10 }}>Belum ada produk untuk ditampilkan</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        <b>{menu.restaurant.name}</b> belum memiliki item dengan harga tetap yang tersedia untuk dijual.
        {skippedTotal > 0 && ` ${skippedTotal === 1 ? 'Satu item' : `${skippedTotal} item`} tidak ditampilkan: ${reasons.join(', ')}.`}
      </p>
      <ol style={{ margin: '16px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li>
          Di Loyverse Back Office buka <b>Items › Categories</b> lalu tambahkan kategori Anda.
        </li>
        <li>
          Buka <b>Items › Item list</b> lalu tambahkan item dengan <b>harga tetap</b>, masing-masing dalam satu kategori. Foto dan deskripsi juga tampil di sini.
        </li>
        <li>Tunggu hingga lima menit, lalu tekan tombol di bawah.</li>
      </ol>
      <div className="row wrap" style={{ marginTop: 16 }}>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>
          Muat ulang menu
        </button>
        <span className="muted small">Menu dibaca ulang dari Loyverse setiap lima menit.</span>
      </div>
    </div>
  );
}
