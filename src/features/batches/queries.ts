import { Prisma, type BatchStatus } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRODUCTION_EVIDENCE_BUCKET, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { scaleProducedRecipeIngredients } from "@/lib/recipes/scaling";
import type { RecipeSnapshot } from "@/lib/recipes/snapshot";
import type { BatchListFilters, BatchListItem, BatchTraceability, PagedBatches } from "./types";
import { traceabilitySchema } from "./validation";

const BATCH_EVIDENCE_BUCKET = "batch-evidence";

function decimalToString(value: Prisma.Decimal | null | undefined) {
  return value == null ? "0" : value.toString();
}

function canViewBatches(permissions: string[]) {
  return permissions.includes("inventory:view") || permissions.includes("production-orders:view") || permissions.includes("production-orders:view_all");
}

function canViewFullTraceability(session: Awaited<ReturnType<typeof getServerSession>>) {
  return session.user.role === "administrator" || session.user.role === "supervisor" || session.user.permissions.includes("audit:view");
}

function pageInput(page?: number, pageSize?: number) {
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.min(100, Math.max(1, pageSize ?? 25));
  return { page: safePage, pageSize: safePageSize, skip: (safePage - 1) * safePageSize };
}

function orderByFor(sort?: BatchListFilters["sort"]): Prisma.ProductionBatchOrderByWithRelationInput {
  if (sort === "expiry") return { expiryDate: "asc" };
  if (sort === "status") return { status: "asc" };
  if (sort === "batchNumber") return { batchNumber: "desc" };
  return { createdAt: "desc" };
}

function toListItem(
  batch: Prisma.ProductionBatchGetPayload<{ include: { recipe: true; warehouse: true } }>
): BatchListItem {
  return {
    id: batch.id,
    batchNumber: batch.batchNumber,
    productName: batch.recipe.nameEn || batch.recipe.nameAr,
    status: batch.status,
    productionDate: batch.productionDate.toISOString(),
    expiryDate: batch.expiryDate.toISOString(),
    producedQuantity: decimalToString(batch.producedQuantity),
    remainingQuantity: decimalToString(batch.remainingQuantity),
    unit: batch.unit,
    warehouseName: batch.warehouse.name
  };
}

export async function getBatchList(filters: BatchListFilters = {}): Promise<PagedBatches> {
  const session = await getServerSession();
  if (!canViewBatches(session.user.permissions)) throw new Error("PERMISSION_DENIED");
  const { page, pageSize, skip } = pageInput(filters.page, filters.pageSize);
  const search = filters.search?.trim();
  const where: Prisma.ProductionBatchWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(search
      ? {
          OR: [
            { batchNumber: { contains: search, mode: "insensitive" } },
            { recipe: { nameEn: { contains: search, mode: "insensitive" } } },
            { recipe: { nameAr: { contains: search, mode: "insensitive" } } },
            { recipe: { code: { contains: search, mode: "insensitive" } } }
          ]
        }
      : {})
  };
  const [items, total] = await Promise.all([
    prisma.productionBatch.findMany({
      where,
      include: { recipe: true, warehouse: true },
      orderBy: orderByFor(filters.sort),
      skip,
      take: pageSize
    }),
    prisma.productionBatch.count({ where })
  ]);
  return { items: items.map(toListItem), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getNearExpiryBatches(days = 7) {
  const session = await getServerSession();
  if (!canViewBatches(session.user.permissions)) throw new Error("PERMISSION_DENIED");
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + days);
  const batches = await prisma.productionBatch.findMany({
    where: { status: "ACTIVE", expiryDate: { gte: now, lte: threshold } },
    include: { recipe: true, warehouse: true },
    orderBy: { expiryDate: "asc" },
    take: 10
  });
  return batches.map(toListItem);
}

async function signedEvidenceUrl(storagePath: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return "";
  const { data } = await supabase.storage.from(BATCH_EVIDENCE_BUCKET).createSignedUrl(storagePath, 60 * 10);
  return data?.signedUrl ?? "";
}

async function signedProductionEvidenceUrl(storagePath: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return "";
  const { data } = await supabase.storage.from(PRODUCTION_EVIDENCE_BUCKET).createSignedUrl(storagePath, 60 * 10);
  return data?.signedUrl ?? "";
}

async function displayNames(userIds: Array<string | null | undefined>) {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  if (ids.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } });
  return new Map(users.map((user) => [user.id, user.displayName]));
}

export async function getBatchTraceabilityAction(input: { batchNumber: string }): Promise<{ success: true; data: BatchTraceability } | { success: false; error: string }> {
  try {
    const session = await getServerSession();
    if (!canViewBatches(session.user.permissions)) throw new Error("PERMISSION_DENIED");
    const parsed = traceabilitySchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Invalid batch number." };
    const full = canViewFullTraceability(session);
    const batch = await prisma.productionBatch.findUnique({
      where: { batchNumber: parsed.data.batchNumber },
      include: {
        recipe: true,
        recipeVersion: true,
        warehouse: true,
        productionOrder: {
          include: {
            steps: {
              include: {
                photos: { orderBy: { uploadedAt: "desc" } },
                notes: { orderBy: { addedAt: "asc" } }
              },
              orderBy: { stepNumber: "asc" }
            }
          }
        },
        containers: { include: { warehouse: true }, orderBy: { containerNumber: "asc" } },
        statusHistory: { include: { changedBy: true }, orderBy: { changedAt: "asc" } },
        printHistory: { include: { printedBy: true, container: true }, orderBy: { printedAt: "desc" } },
        disposals: { include: { disposedBy: true }, orderBy: { disposedAt: "desc" } },
        evidence: { orderBy: { uploadedAt: "desc" } }
      }
    });
    if (!batch) return { success: false, error: "Batch not found." };
    const base = toListItem(batch);
    const productionOrder = batch.productionOrder;
    const snapshot = batch.recipeVersion.snapshot as RecipeSnapshot;
    const scaledRecipe = scaleProducedRecipeIngredients(
      snapshot,
      productionOrder.producedQuantity ?? productionOrder.targetQuantity
    );
    const productionUserNames = await displayNames([
      productionOrder.createdById,
      productionOrder.assignedToId,
      productionOrder.completedById,
      ...productionOrder.steps.flatMap((step) => [
        step.completedById,
        ...step.photos.map((photo) => photo.uploadedById),
        ...step.notes.map((note) => note.addedById)
      ])
    ]);
    const productionSteps = await Promise.all(
      productionOrder.steps.map(async (step) => ({
        id: step.id,
        stepNumber: step.stepNumber,
        title: step.title,
        instructions: step.instructions,
        estimatedMinutes: step.estimatedMinutes,
        requiresPhoto: step.requiresPhoto,
        requiresNotes: step.requiresNotes,
        requiresQuantity: step.requiresQuantity,
        isCompleted: step.isCompleted,
        completedByName: step.completedById ? productionUserNames.get(step.completedById) ?? "Unknown user" : null,
        startedAt: step.startedAt?.toISOString() ?? null,
        completedAt: step.completedAt?.toISOString() ?? null,
        confirmedQuantity: step.confirmedQuantity?.toString() ?? null,
        confirmedUnit: step.confirmedUnit,
        photos: await Promise.all(
          step.photos.map(async (photo) => ({
            id: photo.id,
            url: await signedProductionEvidenceUrl(photo.storagePath),
            mimeType: photo.mimeType,
            uploadedByName: productionUserNames.get(photo.uploadedById) ?? "Unknown user",
            uploadedAt: photo.uploadedAt.toISOString()
          }))
        ),
        notes: step.notes.map((note) => ({
          id: note.id,
          content: note.content,
          addedByName: productionUserNames.get(note.addedById) ?? "Unknown user",
          addedAt: note.addedAt.toISOString()
        }))
      }))
    );
    const evidence = full
      ? await Promise.all(
          batch.evidence.map(async (item) => ({
            id: item.id,
            fileName: item.fileName,
            fileUrl: await signedEvidenceUrl(item.storagePath),
            mimeType: item.mimeType,
            uploadedAt: item.uploadedAt.toISOString()
          }))
        )
      : undefined;
    return {
      success: true,
      data: {
        ...base,
        recipeDetails: full
          ? {
              name: batch.recipe.nameEn || batch.recipe.nameAr,
              code: batch.recipe.code,
              version: batch.recipeVersion.versionNumber,
              storageInstructions: batch.recipe.storageNotes
            }
          : undefined,
        recipeBaseYieldQuantity: scaledRecipe.summary.baseYieldQuantity,
        recipeBaseYieldUnit: scaledRecipe.summary.baseYieldUnit,
        recipeScaledQuantity: scaledRecipe.summary.scaledQuantity,
        recipeScaledUnit: scaledRecipe.summary.scaledUnit,
        recipeScaleMode: scaledRecipe.summary.scaleMode,
        recipeIngredients: scaledRecipe.ingredients,
        productionOrder: {
          id: productionOrder.id,
          orderNumber: productionOrder.orderNumber,
          status: productionOrder.status,
          createdAt: productionOrder.createdAt.toISOString(),
          startedAt: productionOrder.startedAt?.toISOString() ?? null,
          completedAt: productionOrder.completedAt?.toISOString() ?? null,
          durationSeconds: productionOrder.durationSeconds,
          creationNotes: productionOrder.creationNotes,
          createdByName: productionUserNames.get(productionOrder.createdById) ?? "Unknown user",
          assignedToName: productionOrder.assignedToId ? productionUserNames.get(productionOrder.assignedToId) ?? "Unknown user" : null,
          completedByName: productionOrder.completedById ? productionUserNames.get(productionOrder.completedById) ?? "Unknown user" : null
        },
        productionSteps,
        containers: batch.containers.map((container) => ({
          id: container.id,
          containerNumber: container.containerNumber,
          quantity: decimalToString(container.quantity),
          remainingQuantity: decimalToString(container.remainingQuantity),
          status: container.status,
          warehouseId: container.warehouseId,
          warehouseName: container.warehouse.name
        })),
        statusHistory: batch.statusHistory.map((item) => ({
          id: item.id,
          fromStatus: item.fromStatus,
          toStatus: item.toStatus,
          changedByName: full ? item.changedBy.displayName : "Restricted",
          reason: item.reason,
          changedAt: item.changedAt.toISOString()
        })),
        printHistory: full
          ? batch.printHistory.map((item) => ({
              id: item.id,
              labelTemplate: item.labelTemplate,
              printedByName: item.printedBy.displayName,
              printedAt: item.printedAt.toISOString(),
              isReprint: item.isReprint,
              reprintReason: item.reprintReason,
              containerNumber: item.container?.containerNumber ?? null
            }))
          : undefined,
        disposals: full
          ? batch.disposals.map((item) => ({
              id: item.id,
              quantityDisposed: decimalToString(item.quantityDisposed),
              reason: item.reason,
              notes: item.notes,
              disposedByName: item.disposedBy.displayName,
              disposedAt: item.disposedAt.toISOString()
            }))
          : undefined,
        evidence
      }
    };
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "PERMISSION_DENIED")) throw error;
    return { success: false, error: error instanceof Error ? error.message : "Unable to load batch traceability." };
  }
}

export function batchStatusOptions(): BatchStatus[] {
  return ["ACTIVE", "CONSUMED", "EXPIRED", "DISPOSED"];
}
