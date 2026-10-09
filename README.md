# Restaurant table ordering

Guests scan a QR code on their table, pick dishes on their phone, enter their name and confirm.
The order is written into **Loyverse** (the restaurant's POS) as a receipt, so the kitchen and the cashier
see it where they already work. The menu itself comes from Loyverse too. There is no staff screen or
dashboard in this app on purpose: Loyverse is the back office.

The whole thing is **one Cloudflare Worker**: a React UI served as static assets plus a small Hono API.
It fits the Cloudflare free plan.

```
.
├── index.html            Vite entry for the React app
├── src/                  React UI (order page, cart, name + confirmation, sent orders)
├── worker/               Hono API: menu from Loyverse, orders → Loyverse receipts
├── shared/types.ts       Types used by both sides
├── scripts/loyverse-import-items.csv   Sample menu in Loyverse's import format (for a dev account)
├── wrangler.jsonc        Worker config and non-secret vars
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
Until `.dev.vars` holds a real token the app shows a setup screen instead of a menu.

## How an order flows

1. The page loads `/api/menu`. The Worker pulls categories, items and store prices from Loyverse and
   caches them for five minutes. Only items with a **fixed price** that are **available for sale** in the
   store are shown; variable-price items cannot be self-ordered.
2. The guest builds a cart. Lines are kept in menu order, which is category order, then name.
3. Before confirming, the guest enters a **name**. Loyverse does not require one, but the cashier needs
   a way to match the guest to the receipt.
4. `POST /api/orders` re-prices every line from the menu snapshot (the browser only sends ids and
   quantities) and creates a Loyverse receipt: store from the account, payment type from
   `LOYVERSE_PAYMENT_TYPE`, note `Table 5 · Name · kitchen note`, order reference like `T5-K3F9Q`.
5. The guest sees the receipt number, and the order is listed under "Your orders" on that phone.

Loyverse's public API cannot create open tickets, so the receipt is final at order time and carries one
payment type. Create a payment type such as **"Pay at cashier"** in Back Office > Settings > Payment
types and set `LOYVERSE_PAYMENT_TYPE` to it, so these sales are easy to tell apart in reports. Do not
ring the order up a second time at the till; the guest pays and the receipt already exists.

## Configuration

| Where | Name | Meaning |
|---|---|---|
| `.dev.vars` / `wrangler secret` | `LOYVERSE_TOKEN` | Back Office > Integrations > Access tokens. Never reaches the browser. |
| `.dev.vars` / `wrangler secret` | `LOYVERSE_STORE_ID` | Optional. Which store to sell from when the account has several. |
| `wrangler.jsonc` vars | `LOYVERSE_PAYMENT_TYPE` | Name of the payment type written on receipts (default `Cash`). |
| `wrangler.jsonc` vars | `CATEGORY_ORDER` | Optional, e.g. `Ramen, Sushi, Sides, Drinks, Dessert`. Named categories come first in that order; the rest follow by creation time. |
| `wrangler.jsonc` vars | `TABLE_COUNT` | Number of tables (default 8). |
| `wrangler.jsonc` vars | `RESTAURANT_NAME` | Overrides the business name from Loyverse. |

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/menu` | Categories and products from Loyverse (cached 5 min, `?refresh=1` re-pulls) |
| POST | `/api/orders` | Place an order. Body `{ table, customerName, items: [{ id, qty }], note, clientOrderId }`. Returns the Loyverse receipt number. |

## Filling a dev Loyverse account

A fresh account has no categories or priced items, and the app shows a "No products to show yet" screen.
`scripts/loyverse-import-items.csv` holds a sample menu (5 categories, 23 items with fixed prices) in
Loyverse's own item export layout. Upload it in Back Office > Items > Item list > Import. Categories
named in the file are created during the import. The store columns are named for a store called
`test`; rename them if your store is called something else.

## Deploy

```bash
npx wrangler login
npx wrangler secret put LOYVERSE_TOKEN
npm run deploy
```

## Dev tools

- `loyverse-explorer/`: paste a token and browse every resource the API returns, with the ids the
  Worker needs.
- `demo/`: the original static HTML prototype this app was ported from.
