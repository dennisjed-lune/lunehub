# LuneHub

Prototype of **LuneHub** — the bank-facing enrichment & analytics portal for the Lune platform (example tenant: ADIB). Self-contained HTML/CSS/JS, no build step.

## Run locally

```bash
python3 -m http.server 4178
```

Then open **http://localhost:4178/app.html** and sign in with any email + password.

> Serve over HTTP (not `file://`) — the embedded modules and relative assets won't resolve otherwise. Keep the window reasonably wide so the treemap renders.

## What's inside

- **`app.html`** — entry point (cache-fresh copy of `lunehub.html`).
- **`lunehub.css` / `lunehub.js`** — styles and behaviour.
- **`lunehub-data.js`** — seeded demo data generator: 2,000 customers, ~294k transactions, top UAE brands, multi-country / multi-currency, full enrichment fields + per-customer demographics.
- **`lune-geo.html`** — embedded Spend Map module (iframe).
- **`lune-pulse.html`** — embedded Pulse Campaign Manager module (iframe; loads React/Babel from CDN, needs internet).
- **`assets/`** — logo + favicon.

## Views

Overview · Enrichment (Transactions) · Analytics (Dashboard treemap, Brand Explorer, category/brand detail with demographics, Spend Map) · Pulse (Campaign Manager) · Settings.

_Demo/prototype — figures are synthetic; brand logos are fetched from a public favicon service at runtime._
