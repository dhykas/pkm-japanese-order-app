# Loyverse Explorer

Paste an access token, see everything the Loyverse API returns for that account: merchant, stores,
categories, items with their variant ids and prices, modifiers, payment types, receipts, and more.
It also prints the config values the real app will need (store id, payment type ids).

Read-only. The Worker refuses anything but GET, so it can never write to the account.

## Run locally

```bash
cd loyverse-explorer
npm install
npm run dev
```

Open http://localhost:8787 and paste a token from Back Office > Integrations > Access tokens.

Open the page **through that address**, not through VS Code Live Server (port 5500) or by double-clicking
the file. Those serve the HTML but have no `/api` route, so every request 404s. If you prefer Live Server
for editing, keep `npm run dev` running as well and type `http://localhost:8787` into the Worker URL field
on the page; the Worker allows requests from localhost origins.

## Why a Worker and not just an HTML file

https://api.loyverse.com/v1.0/ sends no CORS headers, so a browser page cannot call it directly. The page calls
its own Worker at `/api/...`, which forwards the request with the token. Nothing is stored server side.

## Deploying

`npm run deploy` publishes it to a workers.dev URL. Anyone with the URL can then use it as a proxy
with their own token, so if you deploy it, put Cloudflare Access in front of it or keep it local.
