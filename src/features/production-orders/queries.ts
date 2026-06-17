import { Prisma, type ProductionOrderStatus } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { paginationInput, totalPages } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { PRODUCTION_EVIDENCE_BUCKET, getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  CREATE_PRODUCTION_ORDERS,
  VIEW_ALL_PRODUCTION_ORDERS,
  VIEW_PRODUCTION_ORDERS,
  hasProductionOrderPermission
} from "./lib/permissions";
import type {
  AssignableStaffDto,
  CreatableRecipeVersionDto,
  OrderQueueItemDto,
  ProductionOrderDetailDto,
  ProductionOrderListItemDto,
  ProductionOrderSortKey,
  ProductionOrderStepDto,
  ProductionOrderStatusHistoryDto
} from "./types";

type ListFilters = {
  search?: string;
  status?: ProductionOrderStatus | ProductionOrderStatus[];
  recipeId?: string;
  assignedToId?: string;
  fromDate?: Date;
  toDate?: Date;
  sort?: ProductionOrderSortKey;
};

function decimalToString(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : value.toString();
}

function assertCanView(permissions: string[]) {
  if (!hasProductionOrderPermission(permissions, VIEW_PRODUCTION_ORDERS) && !hasProductionOrderPermission(permissions, VIEW_ALL_PRODUCTION_ORDERS)) {
    throw new Error("PERMISSION_DENIED");
  }
}

async function displayNames(userIds: Array<string | null | undefined>) {
  const ids = Array.from(new Set(userIds.filter(Boolean) as string[]));
  if (ids.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } });
  return new Map(users.map((user) => [user.id, user.displayName]));
}

function toListItem(
  order: {
    id: string;
    orderNumber: string;
    status: ProductionOrderStatus;
    version: number;
    recipeNameSnapshot: string;
    yieldUnit: string;
    targetQuantity: Prisma.Decimal | null;
    producedQuantity: Prisma.Decimal | null;
    assignedToId: string | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  },
  names: Map<string, string>
): ProductionOrderListItemDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    version: order.version,
    recipeName: order.recipeNameSnapshot,
    yieldUnit: order.yieldUnit,
    targetQuantity: decimalToString(order.targetQuantity),
    producedQuantity: decimalToString(order.producedQuantity),
    assignedToName: order.assignedToId ? names.get(order.assignedToId) ?? "Unknown" : null,
    createdAt: order.createdAt.toISOString(),
    startedAt: order.startedAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null
  };
}

function orderByFor(sort?: ProductionOrderSortKey): Prisma.ProductionOrderOrderByWithRelationInput {
  if (sort === "startedAt") return { startedAt: "desc" };
  if (sort === "completedAt") return { completedAt: "desc" };
  if (sort === "status") return { status: "asc" };
  return { createdAt: "desc" };
}

export async function getProductionOrderList(
  filters: ListFilters = {},
  pagination: { page?: number; pageSize?: number } = {}
): Promise<{ items: ProductionOrderListItemDto[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const session = await getServerSession();
  assertCanView(session.user.permissions);

  const canViewAll = hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS);
  const andFilters: Prisma.ProductionOrderWhereInput[] = [];
  if (!canViewAll) andFilters.push({ assignedToId: session.user.id });
  if (filters.search?.trim()) andFilters.push({ orderNumber: { contains: filters.search.trim(), mode: "insensitive" } });
  if (filters.status) andFilters.push({ status: Array.isArray(filters.status) ? { in: filters.status } : filters.status });
  if (filters.recipeId) andFilters.push({ recipeId: filters.recipeId });
  if (filters.assignedToId) andFilters.push({ assignedToId: filters.assignedToId });
  if (filters.fromDate || filters.toDate) andFilters.push({ createdAt: { gte: filters.fromDate, lte: filters.toDate } });

  const where: Prisma.ProductionOrderWhereInput = andFilters.length ? { AND: andFilters } : {};
  const { page, pageSize, skip, take } = paginationInput(pagination.page, pagination.pageSize);
  const [items, total] = await Promise.all([
    prisma.productionOrder.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        version: true,
        recipeNameSnapshot: true,
        yieldUnit: true,
        targetQuantity: true,
        producedQuantity: true,
        assignedToId: true,
        createdAt: true,
        startedAt: true,
        completedAt: true
      },
      orderBy: orderByFor(filters.sort),
      skip,
      take
    }),
    prisma.productionOrder.count({ where })
  ]);
  const names = await displayNames(items.map((item) => item.assignedToId));
  return {
    items: items.map((item) => toListItem(item, names)),
    total,
    page,
    pageSize,
    totalPages: totalPages(total, pageSize)
  };
}

export async function getUnassignedQueue(): Promise<OrderQueueItemDto[]> {
  const session = await getServerSession();
  if (!hasProductionOrderPermission(session.user.permissions, "production-orders:claim")) {
    throw new Error("PERMISSION_DENIED");
  }
  const canViewAll = hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS);
  const scopedCategories = canViewAll
    ? []
    : await prisma.userRecipeCategory.findMany({ where: { userId: session.user.id }, select: { recipeCategoryId: true } });

  const orders = await prisma.productionOrder.findMany({
    where: {
      status: "PENDING_UNASSIGNED",
      ...(canViewAll ? {} : { recipe: { categoryId: { in: scopedCategories.map((item) => item.recipeCategoryId) } } })
    },
    include: { recipe: { include: { category: true } } },
    orderBy: { createdAt: "asc" },
    take: 100
  });
  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    version: order.version,
    recipeName: order.recipeNameSnapshot,
    categoryName: order.recipe.category?.nameEn || order.recipe.category?.name || null,
    targetQuantity: decimalToString(order.targetQuantity),
    yieldUnit: order.yieldUnit,
    createdAt: order.createdAt.toISOString()
  }));
}

export async function getProductionOrderDetail(id: string): Promise<ProductionOrderDetailDto | null> {
  const session = await getServerSession();
  assertCanView(session.user.permissions);
  const canViewAll = hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS);
  const order = await prisma.productionOrder.findFirst({
    where: {
      id,
      ...(canViewAll ? {} : { assignedToId: session.user.id })
    },
    include: {
      steps: {
        include: {
          photos: { orderBy: { uploadedAt: "asc" } },
          notes: { orderBy: { addedAt: "asc" } }
        },
        orderBy: { stepNumber: "asc" }
      },
      statusHistory: { orderBy: { changedAt: "asc" } },
      downstreamActions: { orderBy: { triggeredAt: "asc" } }
    }
  });
  if (!order) return null;

  const names = await displayNames([
    order.createdById,
    order.assignedToId,
    order.claimedById,
    order.completedById,
    order.cancelledById,
    ...order.statusHistory.map((item) => item.changedById),
    ...order.downstreamActions.map((item) => item.triggeredById),
    ...order.steps.flatMap((step) => step.notes.map((note) => note.addedById))
  ]);
  const steps: ProductionOrderStepDto[] = order.steps.map((step) => ({
    id: step.id,
    stepNumber: step.stepNumber,
    title: step.title,
    instructions: step.instructions,
    estimatedMinutes: step.estimatedMinutes,
    requiresPhoto: step.requiresPhoto,
    requiresNotes: step.requiresNotes,
    requiresQuantity: step.requiresQuantity,
    isCompleted: step.isCompleted,
    completedById: step.completedById,
    startedAt: step.startedAt?.toISOString() ?? null,
    completedAt: step.completedAt?.toISOString() ?? null,
    confirmedQuantity: decimalToString(step.confirmedQuantity),
    confirmedUnit: step.confirmedUnit,
    photos: step.photos.map((photo) => ({
      id: photo.id,
      storagePath: photo.storagePath,
      mimeType: photo.mimeType,
      uploadedById: photo.uploadedById,
      uploadedAt: photo.uploadedAt.toISOString()
    })),
    notes: step.notes.map((note) => ({
      id: note.id,
      content: note.content,
      addedById: note.addedById,
      addedByName: names.get(note.addedById) ?? null,
      addedAt: note.addedAt.toISOString()
    }))
  }));
  const statusHistory: ProductionOrderStatusHistoryDto[] = order.statusHistory.map((item) => ({
    id: item.id,
    fromStatus: item.fromStatus,
    toStatus: item.toStatus,
    changedById: item.changedById,
    changedByName: names.get(item.changedById) ?? null,
    reason: item.reason,
    changedAt: item.changedAt.toISOString()
  }));

  return {
    ...toListItem(order, names),
    recipeId: order.recipeId,
    recipeVersionId: order.recipeVersionId,
    creationNotes: order.creationNotes,
    createdById: order.createdById,
    createdByName: names.get(order.createdById) ?? null,
    assignedToId: order.assignedToId,
    claimedById: order.claimedById,
    completedById: order.completedById,
    cancelledById: order.cancelledById,
    cancellationReason: order.cancellationReason,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    durationSeconds: order.durationSeconds,
    canExecute: order.assignedToId === session.user.id,
    canViewAll,
    steps,
    statusHistory,
    downstreamActions: order.downstreamActions.map((item) => ({
      id: item.id,
      actionType: item.actionType,
      referenceId: item.referenceId,
      triggeredById: item.triggeredById,
      triggeredByName: names.get(item.triggeredById) ?? null,
      triggeredAt: item.triggeredAt.toISOString()
    }))
  };
}

export async function getMyProductionOrders() {
  return getProductionOrderList({}, { pageSize: 50 });
}

export async function getStepPhotoUrl(storagePath: string) {
  const client = getSupabaseAdminClient();
  if (!client) return "";
  const { data } = await client.storage.from(PRODUCTION_EVIDENCE_BUCKET).createSignedUrl(storagePath, 60);
  return data?.signedUrl ?? "";
}

export async function getCreatableRecipeVersions(): Promise<CreatableRecipeVersionDto[]> {
  const session = await getServerSession();
  if (!hasProductionOrderPermission(session.user.permissions, CREATE_PRODUCTION_ORDERS)) {
    throw new Error("PERMISSION_DENIED");
  }
  const canViewAll = hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS);
  const scopedCategories = canViewAll
    ? []
    : await prisma.userRecipeCategory.findMany({ where: { userId: session.user.id }, select: { recipeCategoryId: true } });
  const versions = await prisma.recipeVersion.findMany({
    where: {
      recipe: {
        status: "ACTIVE",
        ...(canViewAll ? {} : { categoryId: { in: scopedCategories.map((item) => item.recipeCategoryId) } })
      }
    },
    include: { recipe: { include: { category: true } } },
    orderBy: [{ publishedAt: "desc" }]
  });
  return versions
    .filter((version) => version.recipe.publishedVersion === version.versionNumber)
    .map((version) => ({
      id: version.id,
      recipeId: version.recipeId,
      recipeName: version.recipe.nameEn || version.recipe.nameAr,
      categoryId: version.recipe.categoryId,
      categoryName: version.recipe.category?.nameEn || version.recipe.category?.name || null,
      yieldQuantity: version.recipe.yieldQuantity.toString(),
      yieldUnit: version.recipe.yieldUnit,
      versionNumber: version.versionNumber
    }));
}

export async function getAssignableStaff(): Promise<AssignableStaffDto[]> {
  const session = await getServerSession();
  if (!hasProductionOrderPermission(session.user.permissions, "production-orders:assign")) return [];
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      userRoles: {
        some: {
          role: {
            rolePermissions: {
              some: { permission: { code: "production-orders:execute" } }
            }
          }
        }
      }
    },
    select: { id: true, displayName: true, email: true },
    orderBy: { displayName: "asc" }
  });
  return users;
}
