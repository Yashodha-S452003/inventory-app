import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/errors";

/** Maps server errors to text safe to show in the UI. */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NOT_FOUND") {
      return "Reservation not found. After changing databases, old links stop working — go home and click Reserve again.";
    }
    return error.message;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return "Database tables are missing. Run npm run db:migrate then npm run db:seed.";
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Cannot connect to the database. Check DATABASE_URL in .env and restart npm run dev.";
  }

  if (error instanceof Error) {
    if (error.message.includes("DATABASE_URL")) {
      return "DATABASE_URL is missing. Add it to .env and restart npm run dev.";
    }
    if (
      error.message.includes("Can't reach database") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND")
    ) {
      return "Cannot reach the database server. Check DATABASE_URL and that Postgres is running.";
    }
    if (process.env.NODE_ENV === "development") {
      return error.message;
    }
  }

  return "Could not load reservation. Check the terminal for details, run db:migrate & db:seed, then restart npm run dev.";
}
