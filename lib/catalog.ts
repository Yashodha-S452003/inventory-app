import { expireStaleReservations } from "@/lib/expire";
import { prisma } from "@/lib/prisma";

export async function listProductsWithStock() {
  await expireStaleReservations();

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      inventories: {
        include: { warehouse: true },
        orderBy: { warehouse: { name: "asc" } },
      },
    },
  });

  return products.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    warehouses: product.inventories.map((inventory) => ({
      warehouseId: inventory.warehouseId,
      warehouseCode: inventory.warehouse.code,
      warehouseName: inventory.warehouse.name,
      totalStock: inventory.totalStock,
      reservedStock: inventory.reservedStock,
      availableStock: inventory.totalStock - inventory.reservedStock,
    })),
  }));
}

export async function listWarehouses() {
  return prisma.warehouse.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      location: true,
    },
  });
}
