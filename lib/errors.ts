export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const notFound = (message = "Resource not found") =>
  new ApiError(message, 404, "NOT_FOUND");

export const conflict = (message = "Not enough stock available") =>
  new ApiError(message, 409, "INSUFFICIENT_STOCK");

export const gone = (message = "Reservation has expired") =>
  new ApiError(message, 410, "RESERVATION_EXPIRED");

export const badRequest = (message: string) =>
  new ApiError(message, 400, "BAD_REQUEST");

export const conflictState = (message: string) =>
  new ApiError(message, 409, "INVALID_STATE");
