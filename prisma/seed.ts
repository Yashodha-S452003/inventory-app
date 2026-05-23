import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  await prisma.idempotencyRecord.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const [east, west] = await Promise.all([
    prisma.warehouse.create({
      data: {
        code: "NYC-01",
        name: "New York Fulfillment",
        location: "Brooklyn, NY",
      },
    }),
    prisma.warehouse.create({
      data: {
        code: "LAX-01",
        name: "Los Angeles Fulfillment",
        location: "Commerce, CA",
      },
    }),
  ]);

  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "ALLO-TEE-001",
        name: "Allo Essential Tee",
        description: "Soft cotton tee — popular SKU for concurrency demos.",
      },
    }),
    prisma.product.create({
      data: {
        sku: "ALLO-MUG-002",
        name: "Allo Ceramic Mug",
        description: "12oz mug with logo.",
      },
    }),
    prisma.product.create({
      data: {
        sku: "ALLO-HOOD-003",
        name: "Allo Zip Hoodie",
        description: "Midweight hoodie, limited run.",
      },
    }),
  ]);

  await prisma.inventory.createMany({
    data: [
      {
        productId: products[0].id,
        warehouseId: east.id,
        totalStock: 3,
        reservedStock: 0,
      },
      {
        productId: products[0].id,
        warehouseId: west.id,
        totalStock: 25,
        reservedStock: 0,
      },
      {
        productId: products[1].id,
        warehouseId: east.id,
        totalStock: 50,
        reservedStock: 0,
      },
      {
        productId: products[1].id,
        warehouseId: west.id,
        totalStock: 40,
        reservedStock: 0,
      },
      {
        productId: products[2].id,
        warehouseId: east.id,
        totalStock: 8,
        reservedStock: 0,
      },
      {
        productId: products[2].id,
        warehouseId: west.id,
        totalStock: 1,
        reservedStock: 0,
      },
    ],
  });

  console.log("Seeded warehouses, products, and inventory.");
  console.log(
    "Tip: reserve ALLO-TEE-001 from NYC-01 — only 3 units to test 409 races.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
