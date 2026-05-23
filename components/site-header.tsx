import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-zinc-900">
          Allo Inventory
        </Link>
        <p className="text-sm text-zinc-500">Reservation take-home demo</p>
      </div>
    </header>
  );
}
