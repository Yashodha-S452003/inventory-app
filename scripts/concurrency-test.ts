/**
 * Fires parallel reserve requests against the last unit of a SKU.
 * Expect exactly one 201 and the rest 409 when run against seeded NYC tee stock.
 *
 * Usage: npx tsx scripts/concurrency-test.ts
 * Requires the dev server at http://localhost:3000 and a seeded database.
 */
import "dotenv/config";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PARALLEL = Number(process.env.PARALLEL ?? 8);

async function main() {
  const productsRes = await fetch(`${BASE_URL}/api/products`);
  const products = (await productsRes.json()) as Array<{
    id: number;
    sku: string;
    warehouses: Array<{ warehouseId: number; warehouseCode: string }>;
  }>;

  const hoodie = products.find((p) => p.sku === "ALLO-HOOD-003");
  const la = hoodie?.warehouses.find((w) => w.warehouseCode === "LAX-01");

  if (!hoodie || !la) {
    throw new Error("Seed data missing — run npm run db:seed");
  }

  const results = await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      const response = await fetch(`${BASE_URL}/api/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: hoodie.id,
          warehouseId: la.warehouseId,
          quantity: 1,
        }),
      });
      return response.status;
    }),
  );

  const created = results.filter((s) => s === 201).length;
  const conflicts = results.filter((s) => s === 409).length;

  console.log({ parallel: PARALLEL, created, conflicts, results });

  if (created !== 1 || conflicts !== PARALLEL - 1) {
    console.error(
      "Expected exactly one 201 and the rest 409 (LAX hoodie has 1 unit).",
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
