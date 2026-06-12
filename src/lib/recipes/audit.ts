import { Prisma, type AuditAction } from "@prisma/client";

type RecipeAuditDelegate = Pick<Prisma.TransactionClient, "recipeAuditLog">;

export async function writeAuditLog(
  tx: RecipeAuditDelegate,
  input: {
    recipeId: string;
    action: AuditAction;
    actorId: string;
    prevValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
  }
) {
  return tx.recipeAuditLog.create({
    data: {
      recipeId: input.recipeId,
      action: input.action,
      actorId: input.actorId,
      ...(input.prevValue === undefined ? {} : { prevValue: input.prevValue }),
      ...(input.newValue === undefined ? {} : { newValue: input.newValue })
    }
  });
}
