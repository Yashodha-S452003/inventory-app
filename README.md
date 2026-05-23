# Allo Inventory Reservations (Take-Home)

Multi-warehouse inventory with **temporary checkout reservations**. When a shopper reserves stock, units are held for **10 minutes**. Confirming decrements `totalStock`; cancel or expiry returns units to the available pool (`totalStock - reservedStock`).

## Live demo

<!-- Replace with your deployed URL -->
**https://your-app.vercel.app**

---

## How to run the app locally

### Prerequisites

- **Node.js 20+**
- **Hosted PostgreSQL** (Neon, Supabase, or Railway). The take-home expects a real remote database, not SQLite.
  - You may use the same `DATABASE_URL` for local dev and production while building the demo.

### Environment variables

Copy the example file and edit `.env` in the project root:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Example: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `CRON_SECRET` | Yes (production cron) | Random secret string. Locally optional unless testing `/api/cron/expire-reservations`. On Vercel, Cron sends `Authorization: Bearer <CRON_SECRET>`. |

**Important**

- Use a **hosted** URL in `.env` if you want local and Vercel to share one database.
- Do **not** use `127.0.0.1` / `localhost` in Vercel — that only works on your machine.
- Keep `.env` out of git (already in `.gitignore`).

### Install dependencies

```bash
npm install
```

### Run migrations

Creates tables from `prisma/migrations`:

```bash
npm run db:migrate
```

If migrate fails on a fresh DB, you can use:

```bash
npx prisma db push
```

### Seed sample data

Loads 2 warehouses, 3 products, and inventory (including low-stock SKUs for concurrency demos):

```bash
npm run db:seed
```

### Start the dev server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

You should see three products with per-warehouse stock and **Reserve** buttons. Click **Reserve** → checkout page with countdown → **Confirm purchase** or **Cancel**.

### Troubleshooting local

| Symptom | Fix |
|---------|-----|
| “No products in database” | Run `npm run db:seed` |
| “Can’t reach database server” | Check `DATABASE_URL`, wake Neon if paused, restart `npm run dev` |
| Changed `.env` but still errors | Stop dev server (Ctrl+C) and run `npm run dev` again |
| Reservation page “not found” after switching DB | Old reservation IDs are invalid; reserve again from home |

### Optional: concurrency smoke test

With `npm run dev` running:

```bash
npm run test:concurrency
```

Fires 8 parallel reserves for **ALLO-HOOD-003 @ LAX-01** (1 unit in seed). Expect **one `201`** and **seven `409`**.

---

## How the expiry mechanism works in production

Reservations expire **10 minutes** after creation (`expiresAt`). When they expire (or are cancelled), status becomes `RELEASED` and `reservedStock` is decremented — `totalStock` is unchanged until a purchase is **confirmed**.

Two mechanisms run in production:

### 1. Lazy cleanup (primary)

`expireStaleReservations()` runs when the **home page** is rendered (server-side), throttled to at most once every **30 seconds** per server instance.

It:

1. Finds `PENDING` reservations with `expiresAt < now`
2. Marks them `RELEASED` in a single transaction
3. Decrements `reservedStock` on the related inventory rows (batched per warehouse)

This is what shoppers usually experience: expired holds free up stock when anyone loads the catalog, without waiting for cron.

Individual reservation reads also release **that** reservation if it is past `expiresAt` when you open the checkout page.

### 2. Vercel Cron (backup)

`vercel.json` schedules:

```json
{
  "path": "/api/cron/expire-reservations",
  "schedule": "0 0 * * *"
}
```

- Runs **once per day at 00:00 UTC** (Vercel **Hobby** plan does not allow per-minute cron).
- `GET /api/cron/expire-reservations` calls the same expiry logic with `force=true` (no throttle).
- Protected by `CRON_SECRET`: requests must send `Authorization: Bearer <CRON_SECRET>`.

Cron is a safety net for expired reservations if the site has no traffic overnight. Under normal demo traffic, lazy cleanup handles expiry within seconds of page load.

### Confirm vs expiry

`POST /api/reservations/:id/confirm` on an expired reservation returns **410 Gone**, releases the hold, and does not decrement `totalStock`.

---

## Trade-offs and what I’d do with more time

### Decisions made

| Area | Choice | Why |
|------|--------|-----|
| **Concurrency** | Single atomic `UPDATE` on `Inventory` | Postgres guarantees no oversell without Redis; one round trip |
| **Expiry** | Lazy cleanup + daily cron | Hobby cron limit; lazy path is good enough for demos and low traffic |
| **Data layer** | Prisma 7 + `@prisma/adapter-pg` | Hosted Postgres as required; driver adapter matches Prisma 7 |
| **Idempotency** | `IdempotencyRecord` table in Postgres | Bonus requirement without Redis; store response body + status per `(key, path)` |
| **UI** | Server-rendered product list + client actions | Faster first paint; fewer client fetches after deploy |
| **Auth** | None | Out of scope for take-home |

### Limitations (honest)

- **Expiry is eventually consistent** — up to ~30s on lazy throttle, or until the next home page hit / daily cron. Not a real-time timer per reservation in the background.
- **No queue/worker** — no dedicated job runner; would use BullMQ / Inngest / etc. at scale.
- **Idempotency records never expire** — production would add TTL cleanup.
- **Public APIs** — no rate limiting or tenant isolation.
- **Single-region Postgres** — no multi-region inventory splits.

### With more time

1. **Per-minute expiry worker** (Pro cron, or external scheduler hitting the expire endpoint every minute).
2. **Integration tests** for concurrent reserve and confirm/release idempotency in CI.
3. **Metrics & alerting** on 409 rate, expiry backlog, and reservation confirm latency.
4. **Redis** for idempotency TTL and optional distributed locks on hot SKUs.
5. **Admin UI** to adjust `totalStock` and inspect active holds.
6. **Structured logging** (request id, reservation id) for support/debugging.

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products` | Products with per-warehouse stock |
| `GET` | `/api/warehouses` | Warehouses |
| `POST` | `/api/reservations` | Reserve units → **409** if insufficient stock |
| `GET` | `/api/reservations/:id` | Reservation details |
| `POST` | `/api/reservations/:id/confirm` | Confirm → **410** if expired |
| `POST` | `/api/reservations/:id/release` | Cancel / release early |

**Reserve body**

```json
{
  "productId": 1,
  "warehouseId": 1,
  "quantity": 1
}
```

**Idempotency (bonus):** send `Idempotency-Key` on `POST /api/reservations` and `POST /api/reservations/:id/confirm`. Retries return the stored response without repeating side effects.

---

## Concurrency design

```sql
UPDATE "Inventory"
SET "reservedStock" = "reservedStock" + $quantity
WHERE "id" = $inventoryId
  AND "totalStock" - "reservedStock" >= $quantity
RETURNING "id";
```

If no row is updated → **409 Conflict**. Confirm/release use transactions with `updateMany` guarded on `status = PENDING` to prevent double application.

---

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Set environment variables: `DATABASE_URL` (hosted Postgres), `CRON_SECRET`.
3. Deploy (`npm run build` runs `prisma generate` automatically).
4. Against production `DATABASE_URL`:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Update the **Live demo** URL at the top of this README.

`vercel.json` uses a **daily** cron schedule for the Hobby plan.

---

## Project structure

```
app/
  api/              # REST route handlers + cron
  reservations/     # Checkout UI
components/         # Product list, reserve button, checkout
lib/                # Reservations, expiry, idempotency, Prisma
prisma/             # Schema, migrations, seed
scripts/            # Concurrency smoke test
```
