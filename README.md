# PKM Japanese Order App 🍜🍣

Aplikasi demo pemesanan makanan untuk restoran Jepang (ramen & sushi). Pelanggan memesan langsung dari meja lewat ponsel, kasir memantau pesanan secara real-time, dan pemilik melihat laporan penjualan di dashboard.

Dibuat dengan **HTML + CSS + JavaScript murni**: tanpa server, tanpa build step, tanpa framework. Cukup buka `index.html` di browser.

## Fitur

| Halaman | Pengguna | Fungsi |
|---|---|---|
| `index.html` | Pelanggan | Halaman utama: pilih meja atau menu bento & platter. Meja yang sedang terisi ditandai. |
| `order.html?table=N` | Pelanggan di meja N | Menu ramen, sushi, side dish, minuman dan dessert dengan pencarian & kategori, keranjang, catatan untuk dapur, status pesanan live, dan tombol **Minta bill**. |
| `bulk.html` | Pelanggan pesan di muka | Menu bento & party platter dengan minimal pembelian, **diskon bertingkat** (5 / 10 / 15 %), pilihan ambil sendiri atau diantar, serta tanggal & jam. |
| `cashier.html` | Kasir | Papan pesanan live: statistik, denah meja dengan permintaan bill, filter tipe (meja / bulk) dan status, ubah status sekali klik. |
| `dashboard.html` | Pemilik / staf | KPI pendapatan, pendapatan per jam, menu terlaris, pesanan per status, pendapatan per meja, pesanan terbaru. Tombol **Generate demo day** untuk mengisi data contoh. |

## Cara menjalankan

1. Clone repository:
   ```bash
   git clone https://github.com/dhykas/pkm-japanese-order-app.git
   cd pkm-japanese-order-app
   ```
2. Buka `index.html` di browser (klik dua kali sudah cukup).
   Opsional, jalankan server lokal: `npx serve .` atau `python -m http.server`.

## Alur demo

1. Buka `index.html`, pilih meja, tambahkan ramen dan sushi, lalu tekan **Place order**.
2. Buka `cashier.html` di tab lain. Pesanan langsung muncul. Tekan **Start cooking → Mark served → Mark paid**; tab pelanggan ikut ter-update.
3. Di tab pelanggan tekan **Request bill**; denah meja di kasir berubah warna untuk meja tersebut.
4. Buka `bulk.html`, tambahkan 10+ bento, lihat progress diskon, isi nama / telepon / tanggal lalu **Send bulk order**. Pesanan muncul di kasir pada filter **Bulk** (New → Preparing → Ready → Paid).
5. Buka `dashboard.html` dan tekan **Generate demo day** untuk melihat grafik satu hari penuh.

## Struktur folder

```
.
├── index.html          # Halaman utama pelanggan
├── order.html          # Pemesanan dari meja
├── bulk.html           # Pemesanan bento & platter (bulk)
├── cashier.html        # Layar kasir
├── dashboard.html      # Dashboard laporan
└── assets/
    ├── css/
    │   └── style.css   # Design system: token tema, komponen, responsive
    └── js/
        ├── app.js      # Storage (Store), helper pesanan, navbar, toast, data demo
        └── menu.js     # Data menu (dummy)
```

## Penyimpanan data

- **Menu** ada di `assets/js/menu.js`: `items` untuk menu meja, `bulk.items` untuk menu bento & platter, `bulk.tiers` untuk tingkatan diskon. Data berbentuk JSON yang dibungkus variabel JavaScript, karena browser memblokir `fetch()` file `.json` lokal saat halaman dibuka langsung dari disk.
- **Pesanan** disimpan di `localStorage` dengan satu key, sehingga tab pelanggan, kasir dan dashboard berbagi "database" yang sama selama berada di browser yang sama. Perubahan disebarkan lewat event `storage` dengan polling ringan sebagai cadangan.
- **Keranjang** (belum dipesan) disimpan di `sessionStorage`, hanya berlaku di tab tersebut.

Contoh struktur pesanan:

```json
{
  "id": "ord_abc123",
  "number": 12,
  "type": "bulk",
  "status": "new",
  "customer": { "name": "PT Maju Jaya", "phone": "021 555 0199", "method": "delivery", "date": "2026-09-24", "time": "11:00", "address": "Jl. Pajajaran No. 7" },
  "items": [{ "id": "b1", "name": "Chicken Teriyaki Bento", "price": 55000, "qty": 30 }],
  "note": "Office lunch",
  "subtotal": 1650000,
  "discountPct": 10,
  "discount": 165000,
  "total": 1485000,
  "billRequested": false,
  "createdAt": 1758600000000,
  "updatedAt": 1758600000000
}
```

Pesanan meja memakai `"type": "table"` dan `"table": 5` sebagai ganti `customer`. Alur status: `new → cooking → served → paid`.

## Pengembangan lanjutan

Untuk menjadikannya aplikasi nyata, ganti objek `Store` di `assets/js/app.js` dengan pemanggilan ke backend (REST atau WebSocket). Halaman lain tidak bergantung langsung pada `localStorage`.

## Teknologi

- HTML5, CSS3, JavaScript (vanilla)
- Font [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP) dari Google Fonts
