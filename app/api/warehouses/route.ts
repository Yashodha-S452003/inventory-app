import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import { listWarehouses } from "@/lib/catalog";

export async function GET() {
  try {
    const warehouses = await listWarehouses();
    return NextResponse.json(warehouses);
  } catch (error) {
    return jsonError(error);
  }
}
