"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  confirmReservation,
  fetchReservation,
  releaseReservation,
} from "@/lib/client-api";
import type { ReservationDto } from "@/lib/types";

function formatCountdown(ms: number) {
  if (ms <= 0) {
    return "00:00";
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type Props = {
  reservationId: number;
  initialReservation: ReservationDto | null;
  initialLoadError: string | null;
};

export function ReservationCheckout({
  reservationId,
  initialReservation,
  initialLoadError,
}: Props) {
  const [reservation, setReservation] = useState<ReservationDto | null>(
    initialReservation,
  );
  const [now, setNow] = useState(() => Date.now());
  const [actionLoading, setActionLoading] = useState<
    "confirm" | "cancel" | null
  >(null);
  const [error, setError] = useState<{
    message: string;
    status?: number;
  } | null>(
    initialLoadError ? { message: initialLoadError } : null,
  );
  const expiredRefreshStarted = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!reservation || reservation.status !== "PENDING") {
      return;
    }

    const expiresAt = new Date(reservation.expiresAt).getTime();
    if (expiresAt > now || expiredRefreshStarted.current) {
      return;
    }

    expiredRefreshStarted.current = true;
    void fetchReservation(reservationId)
      .then(setReservation)
      .catch((err: Error & { status?: number }) => {
        setError({ message: err.message, status: err.status });
      });
  }, [now, reservation, reservationId]);

  async function handleConfirm() {
    setActionLoading("confirm");
    setError(null);
    try {
      const updated = await confirmReservation(reservationId);
      setReservation(updated);
    } catch (err) {
      const apiErr = err as Error & { status?: number };
      setError({ message: apiErr.message, status: apiErr.status });
      if (apiErr.status === 410) {
        const updated = await fetchReservation(reservationId).catch(() => null);
        if (updated) {
          setReservation(updated);
        }
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    setActionLoading("cancel");
    setError(null);
    try {
      const updated = await releaseReservation(reservationId);
      setReservation(updated);
    } catch (err) {
      const apiErr = err as Error & { status?: number };
      setError({ message: apiErr.message, status: apiErr.status });
    } finally {
      setActionLoading(null);
    }
  }

  if (!reservation) {
    return (
      <div className="space-y-4">
        <Alert variant="error" title="Reservation unavailable">
          {error?.message ?? "Reservation not found."}
        </Alert>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Back to products — Reserve again
        </Link>
      </div>
    );
  }

  const expiresAtMs = new Date(reservation.expiresAt).getTime();
  const remainingMs = expiresAtMs - now;
  const isPending = reservation.status === "PENDING";
  const isExpired = isPending && remainingMs <= 0;

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          variant="error"
          title={
            error.status === 410
              ? "410 — Reservation expired"
              : error.status === 409
                ? "409 — Conflict"
                : "Action failed"
          }
        >
          {error.message}
        </Alert>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Reservation #{reservation.id}
            </p>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {reservation.product.name}
            </h1>
            <p className="text-sm text-zinc-600">
              {reservation.quantity} unit(s) at {reservation.warehouse.name}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
              reservation.status === "PENDING"
                ? "bg-amber-100 text-amber-800"
                : reservation.status === "CONFIRMED"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {reservation.status}
          </span>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">SKU</dt>
            <dd className="font-medium">{reservation.product.sku}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Warehouse</dt>
            <dd className="font-medium">{reservation.warehouse.code}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Expires</dt>
            <dd className="font-medium">
              {new Date(reservation.expiresAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Available at warehouse</dt>
            <dd className="font-medium">
              {reservation.inventory.availableStock}
            </dd>
          </div>
        </dl>

        {isPending ? (
          <div className="mt-6 rounded-lg bg-zinc-50 p-4">
            <p className="text-sm text-zinc-600">Time remaining</p>
            <p
              className={`text-4xl font-mono font-semibold tabular-nums ${
                isExpired ? "text-red-600" : "text-zinc-900"
              }`}
            >
              {isExpired ? "Expired" : formatCountdown(remainingMs)}
            </p>
            {isExpired ? (
              <p className="mt-2 text-sm text-zinc-600">
                Releasing held stock…
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {isPending && !isExpired ? (
            <>
              <Button
                disabled={actionLoading !== null}
                onClick={() => void handleConfirm()}
              >
                {actionLoading === "confirm"
                  ? "Confirming…"
                  : "Confirm purchase"}
              </Button>
              <Button
                variant="secondary"
                disabled={actionLoading !== null}
                onClick={() => void handleCancel()}
              >
                {actionLoading === "cancel" ? "Cancelling…" : "Cancel"}
              </Button>
            </>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Back to products
            </Link>
          )}
        </div>
      </section>

      {reservation.status === "CONFIRMED" ? (
        <Alert variant="success" title="Purchase confirmed">
          Stock has been permanently decremented for this warehouse.
        </Alert>
      ) : null}

      {reservation.status === "RELEASED" ? (
        <Alert variant="info" title="Reservation released">
          Units are available again for other shoppers.
        </Alert>
      ) : null}
    </div>
  );
}
