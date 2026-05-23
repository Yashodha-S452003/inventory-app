import { ReserveButton } from "@/components/reserve-button";
import type { ProductWithStock } from "@/lib/types";

type ProductListProps = {
  products: ProductWithStock[];
};

export function ProductList({ products }: ProductListProps) {
  return (
    <div className="space-y-6">
      {products.map((product) => (
        <article
          key={product.id}
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {product.sku}
            </p>
            <h2 className="text-xl font-semibold text-zinc-900">
              {product.name}
            </h2>
            {product.description ? (
              <p className="mt-1 text-sm text-zinc-600">
                {product.description}
              </p>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="py-2 pr-4 font-medium">Warehouse</th>
                  <th className="py-2 pr-4 font-medium">Total</th>
                  <th className="py-2 pr-4 font-medium">Reserved</th>
                  <th className="py-2 pr-4 font-medium">Available</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {product.warehouses.map((warehouse) => (
                  <tr
                    key={warehouse.warehouseId}
                    className="border-b border-zinc-100"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-zinc-900">
                        {warehouse.warehouseName}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {warehouse.warehouseCode}
                      </div>
                    </td>
                    <td className="py-3 pr-4">{warehouse.totalStock}</td>
                    <td className="py-3 pr-4">{warehouse.reservedStock}</td>
                    <td className="py-3 pr-4 font-semibold text-emerald-700">
                      {warehouse.availableStock}
                    </td>
                    <td className="py-3 text-right">
                      <ReserveButton
                        productId={product.id}
                        warehouseId={warehouse.warehouseId}
                        availableStock={warehouse.availableStock}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </div>
  );
}
