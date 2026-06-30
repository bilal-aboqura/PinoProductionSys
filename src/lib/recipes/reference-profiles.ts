import { Prisma, type IngredientReferenceProfile, type Unit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { convertUnitWithContext } from "@/features/inventory/lib/unit-converter";

export type ReferenceProfileValues = Pick<
  IngredientReferenceProfile,
  | "id"
  | "inventoryItemId"
  | "costReferenceQuantity"
  | "costReferenceUnit"
  | "costReferenceValue"
  | "calorieReferenceQuantity"
  | "calorieReferenceUnit"
  | "calorieValue"
  | "effectiveAt"
>;

export function normalizeAgainstReference(
  quantity: Prisma.Decimal.Value,
  unit: Unit,
  referenceQuantity: Prisma.Decimal.Value,
  referenceUnit: Unit,
  context: { unitWeightKg?: Prisma.Decimal.Value | null } = {}
) {
  const converted = convertUnitWithContext(quantity, unit, referenceUnit, context);
  return converted.div(referenceQuantity);
}

export function selectActiveReferenceProfile<T extends { effectiveAt: Date; archivedAt?: Date | null }>(profiles: T[], at = new Date()) {
  return profiles
    .filter((profile) => !profile.archivedAt && profile.effectiveAt <= at)
    .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())[0] ?? null;
}

export async function getActiveReferenceProfiles(inventoryItemIds: string[], at = new Date()) {
  const profiles = await prisma.ingredientReferenceProfile.findMany({
    where: { inventoryItemId: { in: inventoryItemIds }, effectiveAt: { lte: at }, archivedAt: null },
    orderBy: [{ inventoryItemId: "asc" }, { effectiveAt: "desc" }]
  });
  const active = new Map<string, ReferenceProfileValues>();
  for (const profile of profiles) if (!active.has(profile.inventoryItemId)) active.set(profile.inventoryItemId, profile);
  return active;
}
