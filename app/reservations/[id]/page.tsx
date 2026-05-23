import { ReservationCheckout } from "@/components/reservation-checkout";
import { SiteHeader } from "@/components/site-header";
import {
  getReservationById,
  serializeReservation,
} from "@/lib/reservations";
import { formatErrorForUser } from "@/lib/user-error";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReservationPage({ params }: PageProps) {
  const { id } = await params;
  const reservationId = Number(id);

  let initialReservation = null;
  let loadError: string | null = null;

  if (!Number.isFinite(reservationId) || reservationId < 1) {
    loadError = "Invalid reservation id";
  } else {
    try {
      const reservation = await getReservationById(reservationId);
      initialReservation = serializeReservation(reservation);
    } catch (error) {
      console.error("getReservationById failed:", error);
      loadError = formatErrorForUser(error);
    }
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ReservationCheckout
          reservationId={reservationId}
          initialReservation={initialReservation}
          initialLoadError={loadError}
        />
      </main>
    </div>
  );
}
