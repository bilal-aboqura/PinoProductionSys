import { Prisma, type AuditAction } from "@prisma/client";

type ProductionAuditDelegate = Pick<Prisma.TransactionClient, "auditLog">;

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function writeProductionAuditLog(
  tx: ProductionAuditDelegate,
  input: {
    action: AuditAction;
    actorId: string;
    actorName: string;
    orderId: string;
    orderNumber?: string | null;
    prevValue?: unknown;
    newValue?: unknown;
  }
) {
  return tx.auditLog.create({
    data: {
      actorId: input.actorId,
      actorName: input.actorName,
      targetId: null,
      targetName: input.orderNumber ?? input.orderId,
      action: input.action,
      previousValue: input.prevValue === undefined ? Prisma.JsonNull : toJson(input.prevValue),
      newValue: input.newValue === undefined ? toJson({ orderId: input.orderId }) : toJson({ orderId: input.orderId, value: input.newValue })
    }
  });
}
