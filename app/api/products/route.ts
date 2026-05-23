import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import { listProductsWithStock } from "@/lib/catalog";

export async function GET() {
  try {
    const products = await listProductsWithStock();
    return NextResponse.json(products);
  } catch (error) {
    return jsonError(error);
  }
}
