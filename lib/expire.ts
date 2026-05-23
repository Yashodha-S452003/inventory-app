import { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Avoid scanning the DB on every API click (Neon adds ~100–300ms per round trip). */
const EXPIRE_INTERVAL_MS = 30_000;
let lastExpireAt = 0;

/**
 * Releases pending reservations past expiresAt in one transaction.
 * Throttled unless `force` is true (cron).
 */
export async function expireStaleReservations(
  force = false,
): Promise<number> {
  const now = Date.now();
  if (!force && now - lastExpireAt < EXPIRE_INTERVAL_MS) {
    return 0;
  }
  lastExpireAt = now;

  const expired = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    select: { id: true, inventoryId: true, quantity: true },
  });

  if (expired.length === 0) {
    return 0;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.updateMany({
      where: {
        id: { in: expired.map((r) => r.id) },
        status: ReservationStatus.PENDING,
      },
      data: { status: ReservationStatus.RELEASED },
    });

    if (updated.count === 0) {
      return 0;
    }

    const decrementByInventory = new Map<number, number>();
    for (const row of expired) {
      decrementByInventory.set(
        row.inventoryId,
        (decrementByInventory.get(row.inventoryId) ?? 0) + row.quantity,
      );
    }

    await Promise.all(
      [...decrementByInventory.entries()].map(([inventoryId, quantity]) =>
        tx.inventory.update({
          where: { id: inventoryId },
          data: { reservedStock: { decrement: quantity } },
        }),
      ),
    );

    return updated.count;
  });
}
