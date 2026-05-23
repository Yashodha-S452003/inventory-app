import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import {
  getReservationById,
  serializeReservation,
} from "@/lib/reservations";
import { reservationIdSchema } from "@/lib/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reservationId = reservationIdSchema.parse(id);
    const reservation = await getReservationById(reservationId);
    return NextResponse.json(serializeReservation(reservation));
  } catch (error) {
    return jsonError(error);
  }
}
