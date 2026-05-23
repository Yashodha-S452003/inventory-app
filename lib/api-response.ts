import { NextResponse } from "next/server";
import { ApiError } from "@/lib/errors";
import { formatErrorForUser } from "@/lib/user-error";
import { ZodError } from "zod";

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  console.error(error);
  return NextResponse.json(
    {
      error: formatErrorForUser(error),
      code: "INTERNAL_ERROR",
    },
    { status: 500 },
  );
}
