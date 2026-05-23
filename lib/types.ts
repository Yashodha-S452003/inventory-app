export type WarehouseStock = {
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
};

export type ProductWithStock = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  warehouses: WarehouseStock[];
};

export type ReservationDto = {
  id: number;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  createdAt: string;
  product: { id: number; sku: string; name: string };
  warehouse: { id: number; code: string; name: string };
  inventory: {
    totalStock: number;
    reservedStock: number;
    availableStock: number;
  };
};

export type ApiErrorBody = {
  error: string;
  code: string;
  details?: unknown;
};
