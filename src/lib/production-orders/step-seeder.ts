import type { Prisma } from "@prisma/client";
import type { RecipeSnapshot } from "@/lib/recipes/snapshot";

type StepSeederDelegate = Pick<Prisma.TransactionClient, "productionOrderStep">;

type StepSnapshot = RecipeSnapshot["steps"][number] & {
  requiresQuantity?: boolean;
};

export async function seedStepsFromSnapshot(tx: StepSeederDelegate, orderId: string, snapshot: RecipeSnapshot) {
  const steps = (snapshot.steps as StepSnapshot[]).map((step) => ({
    orderId,
    stepNumber: step.stepNumber,
    title: step.title,
    instructions: step.instructions,
    estimatedMinutes: step.estimatedMinutes,
    requiresPhoto: step.requiresPhoto,
    requiresNotes: step.requiresNotes,
    requiresQuantity: Boolean(step.requiresQuantity)
  }));

  if (steps.length === 0) {
    throw new Error("Cannot create a production order from a recipe version with no steps.");
  }

  await tx.productionOrderStep.createMany({ data: steps });
}
