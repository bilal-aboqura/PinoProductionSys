import { z } from "zod";

const codeSchema = z.string().trim().min(1).max(30).regex(/^[A-Z0-9-]+$/i, "Use letters, numbers, and dashes only.");
const positiveDecimal = z.coerce.number().positive();
const nonNegativeDecimal = z.coerce.number().min(0);

export const createItemSchema = z.object({
  code: codeSchema,
  nameAr: z.string().trim().min(2).max(100),
  nameEn: z.string().trim().min(2).max(100),
  itemType: z.enum(["RAW_MATERIAL", "FINISHED_PRODUCT"]),
  categoryId: z.string().min(1),
  unit: z.enum(["KG", "GRAM", "LITER", "MILLILITER", "PIECE"]),
  minStockLevel: nonNegativeDecimal.default(0)
});

export const updateItemSchema = createItemSchema.partial().extend({
  isActive: z.boolean().optional()
});

const referenceUnit = z.enum(["KG", "GRAM", "LITER", "MILLILITER", "PIECE"]);
export const ingredientReferenceProfileSchema = z
  .object({
    inventoryItemId: z.string().min(1),
    costReferenceQuantity: positiveDecimal,
    costReferenceUnit: referenceUnit,
    costReferenceValue: nonNegativeDecimal,
    calorieReferenceQuantity: positiveDecimal,
    calorieReferenceUnit: referenceUnit,
    calorieValue: nonNegativeDecimal,
    effectiveAt: z.coerce.date().optional()
  })
  .superRefine((value, context) => {
    const family = (unit: string) => unit === "PIECE" ? "piece" : unit === "KG" || unit === "GRAM" ? "weight" : "volume";
    if (family(value.costReferenceUnit) !== family(value.calorieReferenceUnit)) {
      context.addIssue({ code: "custom", path: ["calorieReferenceUnit"], message: "Cost and calorie reference units must use the same unit family." });
    }
  });

export const createWarehouseSchema = z.object({
  code: codeSchema.max(10),
  name: z.string().trim().min(3).max(50),
  description: z.string().trim().max(500).optional().nullable()
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable()
});

export const transferSchema = z
  .object({
    itemId: z.string().min(1),
    sourceWhId: z.string().min(1),
    destWhId: z.string().min(1),
    quantity: positiveDecimal,
    notes: z.string().trim().max(1000).optional().nullable()
  })
  .refine((value) => value.sourceWhId !== value.destWhId, {
    path: ["destWhId"],
    message: "Source and destination warehouses must be different."
  });

export const adjustmentSchema = z.object({
  warehouseId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  quantityDelta: z.coerce.number().refine((value) => value !== 0, "Quantity delta cannot be zero."),
  reason: z.enum(["STOCK_COUNT_CORRECTION", "DAMAGED_GOODS", "INVENTORY_RECONCILIATION", "LOST_MATERIALS"]),
  notes: z.string().trim().max(1000).optional().nullable()
});

export const wasteSchema = z.object({
  warehouseId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  quantity: positiveDecimal,
  reason: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(1000).optional().nullable()
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type IngredientReferenceProfileInput = z.infer<typeof ingredientReferenceProfileSchema>;
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type WasteInput = z.infer<typeof wasteSchema>;
