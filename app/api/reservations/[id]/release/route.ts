import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import {
  releaseReservation,
  serializeReservation,
} from "@/lib/reservations";
import { reservationIdSchema } from "@/lib/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reservationId = reservationIdSchema.parse(id);
    const reservation = await releaseReservation(reservationId);
    return NextResponse.json(serializeReservation(reservation));
  } catch (error) {
    return jsonError(error);
  }
}
