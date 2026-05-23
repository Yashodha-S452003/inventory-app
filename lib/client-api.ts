import type { ApiErrorBody, ProductWithStock, ReservationDto } from "@/lib/types";

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function fetchProducts(): Promise<ProductWithStock[]> {
  const response = await fetch("/api/products", { cache: "no-store" });
  const body = await parseJson<ProductWithStock[] | ApiErrorBody>(response);
  if (!response.ok) {
    throw new Error(
      (body as ApiErrorBody).error ?? "Failed to load products",
    );
  }
  if (!Array.isArray(body)) {
    throw new Error("Unexpected response from /api/products");
  }
  return body;
}

export async function createReservation(input: {
  productId: number;
  warehouseId: number;
  quantity: number;
}): Promise<ReservationDto> {
  const response = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<ReservationDto | ApiErrorBody>(response);
  if (!response.ok) {
    throw Object.assign(new Error((body as ApiErrorBody).error), {
      status: response.status,
      code: (body as ApiErrorBody).code,
    });
  }
  return body as ReservationDto;
}

export async function fetchReservation(id: number): Promise<ReservationDto> {
  const response = await fetch(`/api/reservations/${id}`, {
    cache: "no-store",
  });
  const body = await parseJson<ReservationDto | ApiErrorBody>(response);
  if (!response.ok) {
    throw Object.assign(new Error((body as ApiErrorBody).error), {
      status: response.status,
      code: (body as ApiErrorBody).code,
    });
  }
  return body as ReservationDto;
}

export async function confirmReservation(
  id: number,
): Promise<ReservationDto> {
  const response = await fetch(`/api/reservations/${id}/confirm`, {
    method: "POST",
  });
  const body = await parseJson<ReservationDto | ApiErrorBody>(response);
  if (!response.ok) {
    throw Object.assign(new Error((body as ApiErrorBody).error), {
      status: response.status,
      code: (body as ApiErrorBody).code,
    });
  }
  return body as ReservationDto;
}

export async function releaseReservation(
  id: number,
): Promise<ReservationDto> {
  const response = await fetch(`/api/reservations/${id}/release`, {
    method: "POST",
  });
  const body = await parseJson<ReservationDto | ApiErrorBody>(response);
  if (!response.ok) {
    throw Object.assign(new Error((body as ApiErrorBody).error), {
      status: response.status,
      code: (body as ApiErrorBody).code,
    });
  }
  return body as ReservationDto;
}
