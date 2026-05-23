import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import { withIdempotency } from "@/lib/idempotency";
import {
  reserveUnits,
  serializeReservation,
} from "@/lib/reservations";
import { reserveBodySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("Idempotency-Key");

  return withIdempotency(
    idempotencyKey,
    "/api/reservations",
    "POST",
    async () => {
      try {
        const body = reserveBodySchema.parse(await request.json());
        const reservation = await reserveUnits(body);
        return NextResponse.json(serializeReservation(reservation), {
          status: 201,
        });
      } catch (error) {
        return jsonError(error);
      }
    },
  );
}
