import { Prisma, type ShelfLifeUnit } from "@prisma/client";

type BatchSequenceTx = Pick<Prisma.TransactionClient, "$queryRaw">;

export function nextBatchNumberFromExisting(year: number, existingBatchNumber?: string | null) {
  const lastSequence = existingBatchNumber ? Number(existingBatchNumber.slice(-5)) : 0;
  const nextSequence = lastSequence + 1;
  return `B-${year}-${String(nextSequence).padStart(5, "0")}`;
}

export async function generateBatchNumber(tx: BatchSequenceTx, date = new Date()) {
  const year = date.getUTCFullYear();
  const prefix = `B-${year}-`;
  const rows = await tx.$queryRaw<Array<{ batchNumber: string }>>`
    SELECT "batchNumber"
    FROM "production_batches"
    WHERE "batchNumber" LIKE ${`${prefix}%`}
    ORDER BY "batchNumber" DESC
    LIMIT 1
    FOR UPDATE
  `;
  return nextBatchNumberFromExisting(year, rows[0]?.batchNumber);
}

export function calculateExpiryDate(productionDate: Date, shelfLifeValue: number, shelfLifeUnit: ShelfLifeUnit) {
  const expiry = new Date(productionDate);
  if (shelfLifeUnit === "HOURS") expiry.setHours(expiry.getHours() + shelfLifeValue);
  if (shelfLifeUnit === "DAYS") expiry.setDate(expiry.getDate() + shelfLifeValue);
  if (shelfLifeUnit === "WEEKS") expiry.setDate(expiry.getDate() + shelfLifeValue * 7);
  if (shelfLifeUnit === "MONTHS") expiry.setMonth(expiry.getMonth() + shelfLifeValue);
  return expiry;
}

export function sumQuantities(values: Array<number | string | Prisma.Decimal>) {
  return values.reduce<Prisma.Decimal>((sum, value) => sum.add(value), new Prisma.Decimal(0));
}

export function quantitiesMatchTotal(values: Array<number | string | Prisma.Decimal>, total: number | string | Prisma.Decimal) {
  return sumQuantities(values).equals(new Prisma.Decimal(total));
}
