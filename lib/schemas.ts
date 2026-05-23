import { z } from "zod";

export const reserveBodySchema = z.object({
  productId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().max(1000),
});

export const reservationIdSchema = z.coerce.number().int().positive();
