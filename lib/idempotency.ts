import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type IdempotentHandler = () => Promise<NextResponse>;

export async function withIdempotency(
  key: string | null,
  path: string,
  method: string,
  handler: IdempotentHandler,
): Promise<NextResponse> {
  if (!key?.trim()) {
    return handler();
  }

  const id = key.trim();
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { id_path: { id, path } },
  });

  if (existing) {
    return NextResponse.json(existing.body, { status: existing.statusCode });
  }

  const response = await handler();
  const cloned = response.clone();

  let body: unknown;
  try {
    body = await cloned.json();
  } catch {
    body = { ok: true };
  }

  try {
    await prisma.idempotencyRecord.create({
      data: {
        id,
        path,
        method,
        statusCode: response.status,
        body: body as object,
      },
    });
  } catch {
    const raced = await prisma.idempotencyRecord.findUnique({
      where: { id_path: { id, path } },
    });
    if (raced) {
      return NextResponse.json(raced.body, { status: raced.statusCode });
    }
  }

  return response;
}
