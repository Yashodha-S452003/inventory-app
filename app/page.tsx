import { ProductList } from "@/components/product-list";
import { SetupPanel } from "@/components/setup-panel";
import { SiteHeader } from "@/components/site-header";
import { listProductsWithStock } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products: Awaited<ReturnType<typeof listProductsWithStock>> = [];
  let loadError: string | null = null;

  try {
    products = await listProductsWithStock();
  } catch (error) {
    console.error("Failed to load products:", error);
    loadError =
      error instanceof Error
        ? error.message
        : "Could not connect to the database.";
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-zinc-900">Products</h1>
          <p className="mt-2 max-w-2xl text-zinc-600">
            Reserve units at checkout for 10 minutes. Only one concurrent
            reservation succeeds when stock is tight — try{" "}
            <strong>Allo Essential Tee</strong> at <strong>NYC-01</strong> (3
            units).
          </p>
        </div>

        {loadError ? (
          <SetupPanel
            title="Database error"
            message={loadError}
          />
        ) : products.length === 0 ? (
          <SetupPanel
            variant="info"
            title="No products in database"
            message="Migrations may have run, but the database has not been seeded yet."
          />
        ) : (
          <ProductList products={products} />
        )}
      </main>
    </div>
  );
}
