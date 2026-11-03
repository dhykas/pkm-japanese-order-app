# Restaurant table ordering

**Live:** https://dapur-jepang.vercel.app/?table=1 (table 1; change the number for other tables)

Guests scan a QR code on their table, pick dishes on their phone, enter their name and confirm.
The order is written into **Loyverse** (the restaurant's POS) as a receipt, so the kitchen and the cashier
see it where they already work. The menu itself comes from Loyverse too. There is no staff screen or
dashboard in this app on purpose: Loyverse is the back office.

It is hosted on **Vercel** (project `dapur-jepang`): the React UI as static files plus a small Hono API that
runs as one Vercel Function. It fits the Vercel Hobby (free) plan. The UI is in Bahasa Indonesia.

```
.
├── index.html            Vite entry for the React app
├── src/                  React UI (order page, cart, name + confirmation, sent orders)
├── api/[...route].ts     Vercel Function entry: hands every /api/* request to the Hono app
├── worker/               Hono API: menu from Loyverse, orders → Loyverse receipts
├── shared/types.ts       Types used by both sides
├── scripts/loyverse-import-items.csv   Sample menu in Loyverse's import format (for a dev account)
├── vercel.json           Build output, function region (Singapore), SPA rewrites
├── wrangler.jsonc        Local dev only: non-secret vars for the dev server
├── demo/                 The original static HTML demo (open demo/index.html)
└── loyverse-explorer/    Dev tool: paste a token, see everything the Loyverse API returns
```

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars     # then paste your Loyverse access token into it
npm run dev
```

Open http://localhost:5173. Table pages are `/?table=3` and so on; that is what the QR codes point to.
Until `.dev.vars` holds a real token the app shows a setup screen instead of a menu. The dev server runs
the API through the Cloudflare Vite plugin; that is a local runner only, nothing is deployed to Cloudflare.

## How an order flows

1. The page loads `/api/menu`. The API pulls categories, items and store prices from Loyverse and
   caches them for five minutes. Only items with a **fixed price** that are **available for sale** in the
   store are shown; variable-price items cannot be self-ordered.
2. The guest builds a cart. Lines are kept in menu order, which is category order, then name.
3. Before confirming, the guest enters a **name**. Loyverse does not require one, but the cashier needs
   a way to match the guest to the receipt.
4. `POST /api/orders` re-prices every line from the menu snapshot (the browser only sends ids and
   quantities) and creates a Loyverse receipt: store from the account, payment type from
   `LOYVERSE_PAYMENT_TYPE`, note `Meja 5 · Name · kitchen note`, order reference like `T5-K3F9Q`.
5. The guest sees the receipt number, and the order is listed under "Pesanan Anda" on that phone.

Loyverse's public API cannot create open tickets, so the receipt is final at order time and carries one
payment type. Create a payment type such as **"Pay at cashier"** in Back Office > Settings > Payment
types and set `LOYVERSE_PAYMENT_TYPE` to it, so these sales are easy to tell apart in reports. Do not
ring the order up a second time at the till; the guest pays and the receipt already exists.

## Item options (broth, hot / ice)

Options are Loyverse **modifiers** (Back Office > Items > Modifiers), attached to an item in its item page.
Every modifier on an item is a required single choice for the guest: "+ Tambah" opens a picker, and the
choice goes onto the receipt line, so the kitchen sees `Shoyu Ramen · Kuah: Kari`. An option price is
added to the item price. Currently `Kuah` (Miso, Kari, Cream) is on every ramen and `Hot / Ice` on Ocha
and Matcha Latte. Changes in Loyverse show up within five minutes.

## Discount calculator

`/discount` (https://dapur-jepang.vercel.app/discount) is a calculator for staff:
tick menu items, set one discount rate for all of them or a rate per item, optionally round the new prices,
and copy the resulting price list. It only calculates. It does not change prices in Loyverse or on the guest
menu, and it is not linked from the guest pages.

## Configuration

On Vercel all of these are the project's **Environment Variables** (dashboard > dapur-jepang > Settings >
Environment Variables, or `npx vercel env add NAME production`). Redeploy after changing one. Locally, secrets
go in `.dev.vars` and settings in `wrangler.jsonc` vars.

| Kind | Name | Meaning |
|---|---|---|
| Secret | `LOYVERSE_TOKEN` | Back Office > Integrations > Access tokens. Never reaches the browser. |
| Secret | `LOYVERSE_STORE_ID` | Optional. Which store to sell from when the account has several. |
| Setting | `LOYVERSE_PAYMENT_TYPE` | Name of the payment type written on receipts (default `Cash`). |
| Setting | `CATEGORY_ORDER` | Optional, e.g. `Ramen, Sushi, Sides, Drinks, Dessert`. Named categories come first in that order; the rest follow by creation time. |
| Setting | `TABLE_COUNT` | Number of tables (default 8). |
| Setting | `RESTAURANT_NAME` | Overrides the business name from Loyverse. |

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/menu` | Categories and products from Loyverse (cached 5 min) |
| POST | `/api/orders` | Place an order. Body `{ table, customerName, items: [{ id, qty, options? }], note, clientOrderId }`. Returns the Loyverse receipt number. |

## Filling a dev Loyverse account

A fresh account has no categories or priced items, and the app shows a "No products to show yet" screen.
`scripts/loyverse-import-items.csv` holds a sample menu (5 categories, 23 items with fixed prices) in
Loyverse's own item export layout. Upload it in Back Office > Items > Item list > Import. Categories
named in the file are created during the import. The store columns are named for a store called
`test`; rename them if your store is called something else.

## Deploy

```bash
npx vercel login
npx vercel link --project dapur-jepang      # once per machine
npm run deploy                             # vercel deploy --prod
```

Vercel builds with `vite build` and serves `dist/`. Function logs: Vercel dashboard > dapur-jepang > Logs.

## Dev tools

- `loyverse-explorer/`: paste a token and browse every resource the API returns, with the ids the
  API needs.
- `demo/`: the original static HTML prototype this app was ported from.
