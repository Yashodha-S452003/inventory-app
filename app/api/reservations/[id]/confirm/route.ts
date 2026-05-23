import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import { withIdempotency } from "@/lib/idempotency";
import {
  confirmReservation,
  serializeReservation,
} from "@/lib/reservations";
import { reservationIdSchema } from "@/lib/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const idempotencyKey = request.headers.get("Idempotency-Key");

  return withIdempotency(
    idempotencyKey,
    `/api/reservations/${(await context.params).id}/confirm`,
    "POST",
    async () => {
      try {
        const { id } = await context.params;
        const reservationId = reservationIdSchema.parse(id);
        const reservation = await confirmReservation(reservationId);
        return NextResponse.json(serializeReservation(reservation));
      } catch (error) {
        return jsonError(error);
      }
    },
  );
}
