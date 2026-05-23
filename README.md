# Allo Inventory Reservations (Take-Home)

Next.js App Router demo of **temporary stock reservations** across multiple warehouses. When a shopper proceeds to checkout, units are held for **10 minutes**; payment confirmation permanently decrements stock, while cancel/expiry returns units to the available pool.

## Live demo

Deploy to Vercel + hosted Postgres (Neon/Supabase) and add the live URL here after deployment.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 7** + hosted **PostgreSQL**
- **Zod** for API validation
- **Tailwind CSS** for UI

## Local setup

### 1. Prerequisites

- Node.js 20+
- A hosted Postgres database (Neon, Supabase, or Railway free tier)

### 2. Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (`?sslmode=require` for Neon) |
| `CRON_SECRET` | Random string; secures `/api/cron/expire-reservations` |

### 3. Install & migrate

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

If the home page shows **“No products in database”**, run `npm run db:seed` again. If it shows a **database error**, check that Neon is awake (free tier pauses) and `DATABASE_URL` in `.env` is correct, then restart `npm run dev`.

Open [http://localhost:3000](http://localhost:3000).

### 4. Concurrency smoke test

With `npm run dev` running:

```bash
npm run test:concurrency
```

This fires 8 parallel `POST /api/reservations` requests for **ALLO-HOOD-003 @ LAX-01** (seeded with **1** available unit). Expect **exactly one `201`** and **seven `409`** responses.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products` | Products with per-warehouse stock breakdown |
| `GET` | `/api/warehouses` | Warehouse list |
| `POST` | `/api/reservations` | Reserve units (`409` if insufficient stock) |
| `GET` | `/api/reservations/:id` | Reservation details |
| `POST` | `/api/reservations/:id/confirm` | Confirm purchase (`410` if expired) |
| `POST` | `/api/reservations/:id/release` | Cancel / release early |

### Reserve body

```json
{
  "productId": 1,
  "warehouseId": 1,
  "quantity": 1
}
```

## Concurrency design

Reservations use a **single atomic SQL `UPDATE`** so two concurrent requests cannot oversell:

```sql
UPDATE "Inventory"
SET "reservedStock" = "reservedStock" + $quantity
WHERE "id" = $inventoryId
  AND "totalStock" - "reservedStock" >= $quantity
RETURNING "id";
```

If zero rows are updated, the API returns **409**. This avoids application-level read-modify-write races without requiring Redis.

Confirm/release use transactions with `updateMany` guards on `status = PENDING` so double-confirm or double-release is safe.

## Reservation expiry (production)

Two mechanisms work together:

1. **Vercel Cron** (`vercel.json`) calls `GET /api/cron/expire-reservations` every minute. Set `CRON_SECRET` in Vercel; the route checks `Authorization: Bearer <CRON_SECRET>`.
2. **Lazy cleanup** — `expireStaleReservations()` runs on product listing, reservation reads, and reserve/confirm/release so stock heals even if a cron tick is missed.

Expired pending reservations transition to `RELEASED` and decrement `reservedStock` (not `totalStock`).

## Idempotency (bonus)

`POST /api/reservations` and `POST /api/reservations/:id/confirm` accept an **`Idempotency-Key`** header. The server stores the status code + JSON body in `IdempotencyRecord` keyed by `(key, path)`. Retries return the stored response without re-running side effects. Concurrent duplicate keys race on insert; the loser reads the winner’s row.

## Deployment (Vercel + Neon)

1. Create a Neon project and copy the pooled connection string into Vercel env as `DATABASE_URL`.
2. Set `CRON_SECRET` in Vercel (Vercel Cron sends it automatically when configured).
3. Deploy; run migrations against production:

   ```bash
   DATABASE_URL="..." npm run db:migrate
   DATABASE_URL="..." npm run db:seed
   ```

4. Add the production URL to this README.

Build command: `npm run build` (runs `prisma generate`).

## Trade-offs & next steps

| Choice | Rationale |
|--------|-----------|
| Atomic SQL vs Redis lock | Simpler ops; Postgres is the source of truth for inventory |
| Lazy + cron expiry | Eventual consistency within ~1 min; good enough for take-home |
| Idempotency in Postgres | No Redis required; fine for moderate traffic |
| No auth | Out of scope; APIs are public for demo |

With more time: row-level metrics, integration tests in CI, `SELECT FOR UPDATE` variant for confirm path, Redis for idempotency TTL, admin UI for stock adjustments, and structured logging/tracing.

## Project structure

```
app/
  api/          # Route handlers
  reservations/ # Checkout UI
components/     # Client UI
lib/            # Domain logic (reserve, confirm, expire, idempotency)
prisma/         # Schema, migrations, seed
```
