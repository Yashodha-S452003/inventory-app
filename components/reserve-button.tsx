"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createReservation } from "@/lib/client-api";

type ReserveButtonProps = {
  productId: number;
  warehouseId: number;
  availableStock: number;
};

export function ReserveButton({
  productId,
  warehouseId,
  availableStock,
}: ReserveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    message: string;
    status?: number;
  } | null>(null);

  async function handleReserve() {
    setLoading(true);
    setError(null);
    try {
      const reservation = await createReservation({
        productId,
        warehouseId,
        quantity: 1,
      });
      router.push(`/reservations/${reservation.id}`);
    } catch (err) {
      const apiErr = err as Error & { status?: number };
      setError({ message: apiErr.message, status: apiErr.status });
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error ? (
        <Alert
          variant="error"
          title={
            error.status === 409
              ? "409 — Out of stock"
              : "Reservation failed"
          }
        >
          {error.message}
        </Alert>
      ) : null}
      <Button
        disabled={availableStock < 1 || loading}
        onClick={() => void handleReserve()}
      >
        {loading ? "Reserving…" : "Reserve"}
      </Button>
    </div>
  );
}
