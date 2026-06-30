import { Prisma, type Unit } from "@prisma/client";

const weightUnits = new Set<Unit>(["KG", "GRAM"]);
const volumeUnits = new Set<Unit>(["LITER", "MILLILITER"]);

function family(unit: Unit) {
  if (weightUnits.has(unit)) return "weight";
  if (volumeUnits.has(unit)) return "volume";
  return "piece";
}

export function convertUnit(value: Prisma.Decimal.Value, from: Unit, to: Unit) {
  return convertUnitWithContext(value, from, to);
}

export function convertUnitWithContext(
  value: Prisma.Decimal.Value,
  from: Unit,
  to: Unit,
  context: { unitWeightKg?: Prisma.Decimal.Value | null } = {}
): Prisma.Decimal {
  const amount = new Prisma.Decimal(value);
  if (from === to) return amount;
  const unitWeightKg = context.unitWeightKg == null ? null : new Prisma.Decimal(context.unitWeightKg);
  if (unitWeightKg?.gt(0) && from === "PIECE" && family(to) === "weight") {
    return convertUnitWithContext(amount.mul(unitWeightKg), "KG", to);
  }
  if (unitWeightKg?.gt(0) && to === "PIECE" && family(from) === "weight") {
    return convertUnitWithContext(amount, from, "KG").div(unitWeightKg);
  }
  if (family(from) !== family(to)) {
    throw new Error("INVALID_UNIT_CONVERSION");
  }
  if (from === "KG" && to === "GRAM") return amount.mul(1000);
  if (from === "GRAM" && to === "KG") return amount.div(1000);
  if (from === "LITER" && to === "MILLILITER") return amount.mul(1000);
  if (from === "MILLILITER" && to === "LITER") return amount.div(1000);
  throw new Error("INVALID_UNIT_CONVERSION");
}
