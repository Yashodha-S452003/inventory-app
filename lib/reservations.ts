import { Prisma, ReservationStatus } from "@prisma/client";
import { RESERVATION_TTL_MS } from "@/lib/constants";
import { conflict, conflictState, gone, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const reservationInclude = {
  inventory: {
    include: {
      product: true,
      warehouse: true,
    },
  },
} satisfies Prisma.ReservationInclude;

export type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: typeof reservationInclude;
}>;

export function serializeReservation(reservation: ReservationWithRelations) {
  const availableStock =
    reservation.inventory.totalStock - reservation.inventory.reservedStock;

  return {
    id: reservation.id,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    product: {
      id: reservation.inventory.product.id,
      sku: reservation.inventory.product.sku,
      name: reservation.inventory.product.name,
    },
    warehouse: {
      id: reservation.inventory.warehouse.id,
      code: reservation.inventory.warehouse.code,
      name: reservation.inventory.warehouse.name,
    },
    inventory: {
      totalStock: reservation.inventory.totalStock,
      reservedStock: reservation.inventory.reservedStock,
      availableStock,
    },
  };
}

async function releasePendingInTransaction(
  tx: Prisma.TransactionClient,
  reservation: Pick<ReservationWithRelations, "id" | "inventoryId" | "quantity">,
) {
  const updated = await tx.reservation.updateMany({
    where: {
      id: reservation.id,
      status: ReservationStatus.PENDING,
    },
    data: { status: ReservationStatus.RELEASED },
  });

  if (updated.count === 0) {
    return null;
  }

  await tx.inventory.update({
    where: { id: reservation.inventoryId },
    data: { reservedStock: { decrement: reservation.quantity } },
  });

  return tx.reservation.findUniqueOrThrow({
    where: { id: reservation.id },
    include: reservationInclude,
  });
}

export async function getReservationById(id: number) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: reservationInclude,
  });

  if (!reservation) {
    throw notFound("Reservation not found");
  }

  if (
    reservation.status === ReservationStatus.PENDING &&
    reservation.expiresAt <= new Date()
  ) {
    const released = await prisma.$transaction((tx) =>
      releasePendingInTransaction(tx, reservation),
    );
    return released ?? reservation;
  }

  return reservation;
}

export async function reserveUnits(input: {
  productId: number;
  warehouseId: number;
  quantity: number;
}) {
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

  const reservation = await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId: input.productId,
          warehouseId: input.warehouseId,
        },
      },
    });

    if (!inventory) {
      return { error: "not_found" as const };
    }

    const rows = await tx.$queryRaw<{ id: number }[]>`
      UPDATE "Inventory"
      SET "reservedStock" = "reservedStock" + ${input.quantity}
      WHERE "id" = ${inventory.id}
        AND "totalStock" - "reservedStock" >= ${input.quantity}
      RETURNING "id"
    `;

    if (rows.length === 0) {
      return { error: "conflict" as const };
    }

    const created = await tx.reservation.create({
      data: {
        quantity: input.quantity,
        status: ReservationStatus.PENDING,
        expiresAt,
        inventoryId: inventory.id,
      },
      include: reservationInclude,
    });

    return { reservation: created };
  });

  if ("error" in reservation) {
    if (reservation.error === "not_found") {
      throw notFound("No inventory for this product at the selected warehouse");
    }
    throw conflict();
  }

  return reservation.reservation;
}

export async function confirmReservation(id: number) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id },
      include: reservationInclude,
    });

    if (!reservation) {
      throw notFound("Reservation not found");
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      throw conflictState(`Reservation is already ${reservation.status}`);
    }

    if (reservation.expiresAt <= new Date()) {
      await releasePendingInTransaction(tx, reservation);
      throw gone();
    }

    const updated = await tx.reservation.updateMany({
      where: {
        id,
        status: ReservationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      data: { status: ReservationStatus.CONFIRMED },
    });

    if (updated.count === 0) {
      const current = await tx.reservation.findUnique({ where: { id } });
      if (!current) {
        throw notFound("Reservation not found");
      }
      if (current.status !== ReservationStatus.PENDING) {
        throw conflictState(`Reservation is already ${current.status}`);
      }
      await releasePendingInTransaction(tx, reservation);
      throw gone();
    }

    await tx.inventory.update({
      where: { id: reservation.inventoryId },
      data: {
        totalStock: { decrement: reservation.quantity },
        reservedStock: { decrement: reservation.quantity },
      },
    });

    return tx.reservation.findUniqueOrThrow({
      where: { id },
      include: reservationInclude,
    });
  });
}

export async function releaseReservation(id: number) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: reservationInclude,
  });

  if (!reservation) {
    throw notFound("Reservation not found");
  }

  if (reservation.status !== ReservationStatus.PENDING) {
    throw conflictState(`Reservation is already ${reservation.status}`);
  }

  return prisma.$transaction((tx) =>
    releasePendingInTransaction(tx, reservation),
  ).then((released) => {
    if (!released) {
      throw conflictState("Reservation is no longer pending");
    }
    return released;
  });
}
