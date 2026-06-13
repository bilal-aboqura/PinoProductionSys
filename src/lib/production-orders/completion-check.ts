import { Prisma } from "@prisma/client";

type CompletionDelegate = Pick<Prisma.TransactionClient, "productionOrderStepPhoto" | "productionOrderStepNote">;

export async function validateStepCompletable(
  tx: CompletionDelegate,
  step: {
    id: string;
    requiresPhoto: boolean;
    requiresNotes: boolean;
    requiresQuantity: boolean;
    confirmedQuantity?: Prisma.Decimal | null;
  },
  input?: { confirmedQuantity?: number }
) {
  const missing: string[] = [];

  if (step.requiresPhoto) {
    const photoCount = await tx.productionOrderStepPhoto.count({ where: { stepId: step.id } });
    if (photoCount === 0) missing.push("photo");
  }

  if (step.requiresNotes) {
    const noteCount = await tx.productionOrderStepNote.count({ where: { stepId: step.id } });
    if (noteCount === 0) missing.push("note");
  }

  const quantity = input?.confirmedQuantity ?? step.confirmedQuantity?.toNumber();
  if (step.requiresQuantity && (!quantity || quantity <= 0)) {
    missing.push("quantity");
  }

  return { valid: missing.length === 0, missing };
}
