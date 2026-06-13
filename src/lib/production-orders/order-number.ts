import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderNumberDelegate = Pick<Prisma.TransactionClient, "productionOrder">;

function datePrefix(date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `PO-${yyyy}${mm}${dd}-`;
}

export async function generateOrderNumber(tx: OrderNumberDelegate | typeof prisma = prisma, date = new Date()) {
  const prefix = datePrefix(date);
  const latest = await tx.productionOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true }
  });
  const current = Number(latest?.orderNumber.match(/-(\d{4})$/)?.[1] ?? 0);
  return `${prefix}${String(current + 1).padStart(4, "0")}`;
}
