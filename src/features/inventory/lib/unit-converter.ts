import { Prisma, type Unit } from "@prisma/client";

const weightUnits = new Set<Unit>(["KG", "GRAM"]);
const volumeUnits = new Set<Unit>(["LITER", "MILLILITER"]);

function family(unit: Unit) {
  if (weightUnits.has(unit)) return "weight";
  if (volumeUnits.has(unit)) return "volume";
  return "piece";
}

export function convertUnit(value: Prisma.Decimal.Value, from: Unit, to: Unit) {
  const amount = new Prisma.Decimal(value);
  if (from === to) return amount;
  if (family(from) !== family(to)) {
    throw new Error("INVALID_UNIT_CONVERSION");
  }
  if (from === "KG" && to === "GRAM") return amount.mul(1000);
  if (from === "GRAM" && to === "KG") return amount.div(1000);
  if (from === "LITER" && to === "MILLILITER") return amount.mul(1000);
  if (from === "MILLILITER" && to === "LITER") return amount.div(1000);
  throw new Error("INVALID_UNIT_CONVERSION");
}
