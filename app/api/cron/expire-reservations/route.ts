import { NextResponse } from "next/server";
import { expireStaleReservations } from "@/lib/expire";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const expected = `Bearer ${cronSecret}`;
    if (authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const released = await expireStaleReservations(true);
  return NextResponse.json({ released });
}
