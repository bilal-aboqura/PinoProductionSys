"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type ProductionOrderDownstreamActionType, type ProductionOrderStatus } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RecipeSnapshot } from "@/lib/recipes/snapshot";
import { validateStepCompletable } from "@/lib/production-orders/completion-check";
import { generateOrderNumber } from "@/lib/production-orders/order-number";
import { seedStepsFromSnapshot } from "@/lib/production-orders/step-seeder";
import type { ActionResult } from "@/lib/types/action-result";
import { createBatchForCompletedOrder } from "@/features/batches/actions";
import { triggerProductionAlert } from "@/features/notifications/engine";
import { writeProductionAuditLog } from "./lib/audit";
import {
  ASSIGN_PRODUCTION_ORDERS,
  CANCEL_PRODUCTION_ORDERS,
  CLAIM_PRODUCTION_ORDERS,
  COMPLETE_PRODUCTION_ORDERS,
  CREATE_PRODUCTION_ORDERS,
  EXECUTE_PRODUCTION_ORDERS,
  VIEW_ALL_PRODUCTION_ORDERS,
  hasProductionOrderPermission
} from "./lib/permissions";
import { assertValidTransition } from "./lib/status";

const createOrderSchema = z.object({
  recipeVersionId: z.string().min(1),
  targetQuantity: z.coerce.number().positive().optional(),
  assignedToId: z.string().optional().nullable().or(z.literal("")),
  creationNotes: z.string().trim().max(2000).optional().nullable()
});

const completeStepSchema = z.object({
  confirmedQuantity: z.coerce.number().positive().optional(),
  confirmedUnit: z.string().trim().max(40).optional().nullable()
});

function validationError(details: string[]): ActionResult<never> {
  return { success: false, code: "VALIDATION", error: "Validation failed.", details };
}

function unknownError(error: unknown): ActionResult<never> {
  if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "PERMISSION_DENIED")) {
    return { success: false, code: "UNAUTHORIZED", error: "You do not have permission to perform this action." };
  }
  return { success: false, code: "INTERNAL", error: error instanceof Error ? error.message : "Unexpected error." };
}

function requireProductionPermission(permissions: string[], permission: string) {
  if (!hasProductionOrderPermission(permissions, permission as never)) throw new Error("PERMISSION_DENIED");
}

function productionPaths() {
  revalidatePath("/[locale]/production", "page");
  revalidatePath("/[locale]/production/queue", "page");
  revalidatePath("/[locale]/production/[id]", "page");
}

async function runProductionAlertCheck(orderId: string) {
  try {
    await triggerProductionAlert(orderId);
  } catch (error) {
    console.error("Production alert check failed", error);
  }
}

function decimal(value: number | undefined | null) {
  return value == null ? undefined : new Prisma.Decimal(value);
}

async function targetUserCanExecute(userId: string) {
  const count = await prisma.user.count({
    where: {
      id: userId,
      isActive: true,
      userRoles: {
        some: {
          role: {
            rolePermissions: {
              some: { permission: { code: EXECUTE_PRODUCTION_ORDERS } }
            }
          }
        }
      }
    }
  });
  return count > 0;
}

async function userHasRecipeCategory(userId: string, categoryId: string | null) {
  if (!categoryId) return true;
  const count = await prisma.userRecipeCategory.count({ where: { userId, recipeCategoryId: categoryId } });
  return count > 0;
}

async function writeHistory(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    fromStatus: ProductionOrderStatus | null;
    toStatus: ProductionOrderStatus;
    actorId: string;
    reason?: string;
  }
) {
  await tx.productionOrderStatusHistory.create({
    data: {
      orderId: input.orderId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      changedById: input.actorId,
      reason: input.reason
    }
  });
}

export async function createProductionOrder(input: unknown): Promise<ActionResult<{ id: string; orderNumber: string }>> {
  try {
    const session = await getServerSession();
    requireProductionPermission(session.user.permissions, CREATE_PRODUCTION_ORDERS);
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));

    const recipeVersion = await prisma.recipeVersion.findUnique({
      where: { id: parsed.data.recipeVersionId },
      include: { recipe: true }
    });
    if (!recipeVersion || recipeVersion.recipe.status !== "ACTIVE") {
      return { success: false, code: "NOT_FOUND", error: "Active recipe version not found." };
    }
    if (!hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS)) {
      const scoped = await userHasRecipeCategory(session.user.id, recipeVersion.recipe.categoryId);
      if (!scoped) return { success: false, code: "UNAUTHORIZED", error: "Recipe is outside your assigned category scope." };
    }

    const assignedToId = parsed.data.assignedToId || null;
    if (assignedToId && !(await targetUserCanExecute(assignedToId))) {
      return { success: false, code: "VALIDATION", error: "Selected assignee cannot execute production orders." };
    }

    const snapshot = recipeVersion.snapshot as RecipeSnapshot;
    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await generateOrderNumber(tx);
      const status: ProductionOrderStatus = assignedToId ? "PENDING" : "PENDING_UNASSIGNED";
      const created = await tx.productionOrder.create({
        data: {
          orderNumber,
          status,
          recipeId: recipeVersion.recipeId,
          recipeVersionId: recipeVersion.id,
          recipeNameSnapshot: snapshot.nameEn || snapshot.nameAr,
          yieldUnit: snapshot.yieldUnit,
          targetQuantity: decimal(parsed.data.targetQuantity),
          creationNotes: parsed.data.creationNotes || null,
          createdById: session.user.id,
          assignedToId
        }
      });
      await seedStepsFromSnapshot(tx, created.id, snapshot);
      await writeHistory(tx, { orderId: created.id, fromStatus: null, toStatus: status, actorId: session.user.id });
      await writeProductionAuditLog(tx, {
        action: "PRODUCTION_ORDER_CREATED",
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        orderId: created.id,
        orderNumber: created.orderNumber,
        newValue: created
      });
      return created;
    });

    productionPaths();
    return { success: true, data: { id: order.id, orderNumber: order.orderNumber } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function assignProductionOrder(orderId: string, assignedToId: string, version: number): Promise<ActionResult<{ newVersion: number }>> {
  try {
    const session = await getServerSession();
    requireProductionPermission(session.user.permissions, ASSIGN_PRODUCTION_ORDERS);
    if (!(await targetUserCanExecute(assignedToId))) {
      return { success: false, code: "VALIDATION", error: "Selected assignee cannot execute production orders." };
    }
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.productionOrder.findUnique({ where: { id: orderId } });
      if (!existing) return { kind: "missing" as const };
      if (existing.version !== version) return { kind: "conflict" as const };
      if (existing.status !== "PENDING_UNASSIGNED") return { kind: "invalid" as const, message: "Only unassigned orders can be assigned." };
      assertValidTransition(existing.status, "PENDING");
      const updated = await tx.productionOrder.update({
        where: { id: orderId },
        data: { assignedToId, status: "PENDING", version: { increment: 1 } }
      });
      await writeHistory(tx, { orderId, fromStatus: existing.status, toStatus: "PENDING", actorId: session.user.id });
      await writeProductionAuditLog(tx, {
        action: "PRODUCTION_ORDER_ASSIGNED",
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        orderId,
        orderNumber: existing.orderNumber,
        prevValue: existing,
        newValue: updated
      });
      return { kind: "saved" as const, newVersion: updated.version };
    });
    if (result.kind === "missing") return { success: false, code: "NOT_FOUND", error: "Order not found." };
    if (result.kind === "conflict") return { success: false, code: "CONFLICT", error: "This order was modified by another user." };
    if (result.kind === "invalid") return { success: false, code: "VALIDATION", error: result.message };
    productionPaths();
    return { success: true, data: { newVersion: result.newVersion } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function claimProductionOrder(orderId: string, version: number): Promise<ActionResult<{ newVersion: number }>> {
  try {
    const session = await getServerSession();
    requireProductionPermission(session.user.permissions, CLAIM_PRODUCTION_ORDERS);
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.productionOrder.findUnique({ where: { id: orderId }, include: { recipe: true } });
      if (!existing) return { kind: "missing" as const };
      if (existing.version !== version) return { kind: "conflict" as const };
      if (existing.status !== "PENDING_UNASSIGNED") return { kind: "invalid" as const, message: "Order has already been claimed or assigned." };
      if (!hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS)) {
        const scoped = await userHasRecipeCategory(session.user.id, existing.recipe.categoryId);
        if (!scoped) return { kind: "invalid" as const, message: "Order is outside your assigned category scope." };
      }
      assertValidTransition(existing.status, "PENDING");
      const updated = await tx.productionOrder.update({
        where: { id: orderId },
        data: { assignedToId: session.user.id, claimedById: session.user.id, status: "PENDING", version: { increment: 1 } }
      });
      await writeHistory(tx, { orderId, fromStatus: existing.status, toStatus: "PENDING", actorId: session.user.id });
      await writeProductionAuditLog(tx, {
        action: "PRODUCTION_ORDER_CLAIMED",
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        orderId,
        orderNumber: existing.orderNumber,
        prevValue: existing,
        newValue: updated
      });
      return { kind: "saved" as const, newVersion: updated.version };
    });
    if (result.kind === "missing") return { success: false, code: "NOT_FOUND", error: "Order not found." };
    if (result.kind === "conflict") return { success: false, code: "CONFLICT", error: "This order was modified by another user." };
    if (result.kind === "invalid") return { success: false, code: "VALIDATION", error: result.message };
    productionPaths();
    return { success: true, data: { newVersion: result.newVersion } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function startProductionOrder(orderId: string, version: number): Promise<ActionResult<{ newVersion: number }>> {
  try {
    const session = await getServerSession();
    requireProductionPermission(session.user.permissions, EXECUTE_PRODUCTION_ORDERS);
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.productionOrder.findUnique({ where: { id: orderId } });
      if (!existing) return { kind: "missing" as const };
      if (existing.version !== version) return { kind: "conflict" as const };
      if (existing.assignedToId !== session.user.id && !hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS)) {
        return { kind: "forbidden" as const };
      }
      if (existing.status !== "PENDING") return { kind: "invalid" as const, message: "Only pending orders can be started." };
      assertValidTransition(existing.status, "IN_PROGRESS");
      const updated = await tx.productionOrder.update({
        where: { id: orderId },
        data: { status: "IN_PROGRESS", startedAt: existing.startedAt ?? new Date(), version: { increment: 1 } }
      });
      await writeHistory(tx, { orderId, fromStatus: existing.status, toStatus: "IN_PROGRESS", actorId: session.user.id });
      await writeProductionAuditLog(tx, {
        action: "PRODUCTION_ORDER_STARTED",
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        orderId,
        orderNumber: existing.orderNumber,
        prevValue: existing,
        newValue: updated
      });
      return { kind: "saved" as const, newVersion: updated.version };
    });
    if (result.kind === "missing") return { success: false, code: "NOT_FOUND", error: "Order not found." };
    if (result.kind === "conflict") return { success: false, code: "CONFLICT", error: "This order was modified by another user." };
    if (result.kind === "forbidden") return { success: false, code: "UNAUTHORIZED", error: "You are not assigned to this order." };
    if (result.kind === "invalid") return { success: false, code: "VALIDATION", error: result.message };
    productionPaths();
    return { success: true, data: { newVersion: result.newVersion } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function addStepNote(orderId: string, stepId: string, content: string): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getServerSession();
    requireProductionPermission(session.user.permissions, EXECUTE_PRODUCTION_ORDERS);
    const noteContent = content.trim();
    if (noteContent.length < 1 || noteContent.length > 2000) return validationError(["Note must be between 1 and 2000 characters."]);
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({ where: { id: orderId } });
      if (!order) return { kind: "missing" as const };
      if (order.assignedToId !== session.user.id) return { kind: "forbidden" as const };
      if (order.status !== "PENDING" && order.status !== "IN_PROGRESS") return { kind: "invalid" as const, message: "Notes can only be added before completion." };
      const step = await tx.productionOrderStep.findFirst({ where: { id: stepId, orderId } });
      if (!step) return { kind: "missing" as const };
      const note = await tx.productionOrderStepNote.create({ data: { stepId, content: noteContent, addedById: session.user.id } });
      await writeProductionAuditLog(tx, {
        action: "PRODUCTION_ORDER_NOTE_ADDED",
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        orderId,
        orderNumber: order.orderNumber,
        newValue: note
      });
      return { kind: "saved" as const, id: note.id };
    });
    if (result.kind === "missing") return { success: false, code: "NOT_FOUND", error: "Order or step not found." };
    if (result.kind === "forbidden") return { success: false, code: "UNAUTHORIZED", error: "You are not assigned to this order." };
    if (result.kind === "invalid") return { success: false, code: "VALIDATION", error: result.message };
    productionPaths();
    return { success: true, data: { id: result.id } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function completeStep(
  orderId: string,
  stepId: string,
  input: unknown,
  version: number
): Promise<ActionResult<{ newVersion: number; autoStarted: boolean }>> {
  try {
    const session = await getServerSession();
    requireProductionPermission(session.user.permissions, EXECUTE_PRODUCTION_ORDERS);
    const parsed = completeStepSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({ where: { id: orderId } });
      if (!order) return { kind: "missing" as const };
      if (order.version !== version) return { kind: "conflict" as const };
      if (order.assignedToId !== session.user.id) return { kind: "forbidden" as const };
      if (order.status !== "PENDING" && order.status !== "IN_PROGRESS") {
        return { kind: "invalid" as const, message: "Only pending or in-progress orders can be executed." };
      }
      const currentStep = await tx.productionOrderStep.findFirst({
        where: { orderId, isCompleted: false },
        orderBy: { stepNumber: "asc" }
      });
      if (!currentStep) return { kind: "invalid" as const, message: "All steps are already complete." };
      if (currentStep.id !== stepId) return { kind: "invalid" as const, message: "Steps must be completed in sequence." };

      const completeness = await validateStepCompletable(tx, currentStep, parsed.data);
      if (!completeness.valid) return { kind: "missingEvidence" as const, missing: completeness.missing };

      const now = new Date();
      const autoStarted = order.status === "PENDING";
      if (autoStarted) {
        assertValidTransition(order.status, "IN_PROGRESS");
        await writeHistory(tx, { orderId, fromStatus: order.status, toStatus: "IN_PROGRESS", actorId: session.user.id });
        await writeProductionAuditLog(tx, {
          action: "PRODUCTION_ORDER_STARTED",
          actorId: session.user.id,
          actorName: session.user.name ?? session.user.email ?? session.user.id,
          orderId,
          orderNumber: order.orderNumber,
          prevValue: order,
          newValue: { autoStarted: true }
        });
      }
      const updatedStep = await tx.productionOrderStep.update({
        where: { id: stepId },
        data: {
          isCompleted: true,
          startedAt: currentStep.startedAt ?? now,
          completedAt: now,
          completedById: session.user.id,
          confirmedQuantity: currentStep.requiresQuantity ? decimal(parsed.data.confirmedQuantity) : undefined,
          confirmedUnit: currentStep.requiresQuantity ? parsed.data.confirmedUnit || order.yieldUnit : undefined
        }
      });
      const updatedOrder = await tx.productionOrder.update({
        where: { id: orderId },
        data: {
          status: autoStarted ? "IN_PROGRESS" : undefined,
          startedAt: autoStarted ? order.startedAt ?? now : undefined,
          version: { increment: 1 }
        }
      });
      await writeProductionAuditLog(tx, {
        action: "PRODUCTION_ORDER_STEP_COMPLETED",
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        orderId,
        orderNumber: order.orderNumber,
        newValue: updatedStep
      });
      if (currentStep.requiresQuantity) {
        await writeProductionAuditLog(tx, {
          action: "PRODUCTION_ORDER_QUANTITY_CONFIRMED",
          actorId: session.user.id,
          actorName: session.user.name ?? session.user.email ?? session.user.id,
          orderId,
          orderNumber: order.orderNumber,
          newValue: { stepId, confirmedQuantity: parsed.data.confirmedQuantity, confirmedUnit: parsed.data.confirmedUnit || order.yieldUnit }
        });
      }
      return { kind: "saved" as const, newVersion: updatedOrder.version, autoStarted };
    });
    if (result.kind === "missing") return { success: false, code: "NOT_FOUND", error: "Order or step not found." };
    if (result.kind === "conflict") return { success: false, code: "CONFLICT", error: "This order was modified by another user." };
    if (result.kind === "forbidden") return { success: false, code: "UNAUTHORIZED", error: "You are not assigned to this order." };
    if (result.kind === "invalid") return { success: false, code: "VALIDATION", error: result.message };
    if (result.kind === "missingEvidence") return { success: false, code: "VALIDATION", error: "Step requirements are incomplete.", details: result.missing };
    productionPaths();
    return { success: true, data: { newVersion: result.newVersion, autoStarted: result.autoStarted } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function completeProductionOrder(
  orderId: string,
  producedQuantity: number,
  version: number,
  warehouseId?: string
): Promise<ActionResult<{ newVersion: number; batchNumber: string }>> {
  try {
    const session = await getServerSession();
    requireProductionPermission(session.user.permissions, COMPLETE_PRODUCTION_ORDERS);
    if (!Number.isFinite(producedQuantity) || producedQuantity <= 0) return validationError(["Produced quantity must be greater than zero."]);
    if (!warehouseId) return validationError(["A storage warehouse is required to create the finished-product batch."]);
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({ where: { id: orderId } });
      if (!order) return { kind: "missing" as const };
      if (order.version !== version) return { kind: "conflict" as const };
      if (order.assignedToId !== session.user.id && !hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS)) {
        return { kind: "forbidden" as const };
      }
      if (order.status !== "IN_PROGRESS") return { kind: "invalid" as const, message: "Only in-progress orders can be completed." };
      const incomplete = await tx.productionOrderStep.count({ where: { orderId, isCompleted: false } });
      if (incomplete > 0) return { kind: "invalid" as const, message: "All steps must be completed before completing the order." };
      assertValidTransition(order.status, "COMPLETED");
      const completedAt = new Date();
      const durationSeconds = order.startedAt ? Math.max(0, Math.round((completedAt.getTime() - order.startedAt.getTime()) / 1000)) : null;
      const updated = await tx.productionOrder.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          producedQuantity: new Prisma.Decimal(producedQuantity),
          completedAt,
          completedById: session.user.id,
          durationSeconds,
          version: { increment: 1 }
        }
      });
      await writeHistory(tx, { orderId, fromStatus: order.status, toStatus: "COMPLETED", actorId: session.user.id });
      await writeProductionAuditLog(tx, {
        action: "PRODUCTION_ORDER_COMPLETED",
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        orderId,
        orderNumber: order.orderNumber,
        prevValue: order,
        newValue: updated
      });
      const batch = await createBatchForCompletedOrder(tx, {
        productionOrderId: orderId,
        warehouseId,
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        locale: session.user.languagePreference
      });
      return { kind: "saved" as const, newVersion: updated.version, batchNumber: batch.batchNumber };
    });
    if (result.kind === "missing") return { success: false, code: "NOT_FOUND", error: "Order not found." };
    if (result.kind === "conflict") return { success: false, code: "CONFLICT", error: "This order was modified by another user." };
    if (result.kind === "forbidden") return { success: false, code: "UNAUTHORIZED", error: "You are not assigned to this order." };
    if (result.kind === "invalid") return { success: false, code: "VALIDATION", error: result.message };
    productionPaths();
    revalidatePath("/[locale]/inventory/batches", "page");
    await runProductionAlertCheck(orderId);
    return { success: true, data: { newVersion: result.newVersion, batchNumber: result.batchNumber } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function cancelProductionOrder(orderId: string, cancellationReason: string, version: number): Promise<ActionResult<{ newVersion: number }>> {
  try {
    const session = await getServerSession();
    requireProductionPermission(session.user.permissions, CANCEL_PRODUCTION_ORDERS);
    const reason = cancellationReason.trim();
    if (!reason) return validationError(["Cancellation reason is required."]);
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({ where: { id: orderId } });
      if (!order) return { kind: "missing" as const };
      if (order.version !== version) return { kind: "conflict" as const };
      if (!["PENDING_UNASSIGNED", "PENDING", "IN_PROGRESS"].includes(order.status)) {
        return { kind: "invalid" as const, message: `Cannot cancel a ${order.status} order.` };
      }
      assertValidTransition(order.status, "CANCELLED");
      const updated = await tx.productionOrder.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          cancelledById: session.user.id,
          cancellationReason: reason,
          cancelledAt: new Date(),
          version: { increment: 1 }
        }
      });
      await writeHistory(tx, { orderId, fromStatus: order.status, toStatus: "CANCELLED", actorId: session.user.id, reason });
      await writeProductionAuditLog(tx, {
        action: "PRODUCTION_ORDER_CANCELLED",
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        orderId,
        orderNumber: order.orderNumber,
        prevValue: order,
        newValue: updated
      });
      return { kind: "saved" as const, newVersion: updated.version };
    });
    if (result.kind === "missing") return { success: false, code: "NOT_FOUND", error: "Order not found." };
    if (result.kind === "conflict") return { success: false, code: "CONFLICT", error: "This order was modified by another user." };
    if (result.kind === "invalid") return { success: false, code: "VALIDATION", error: result.message };
    productionPaths();
    return { success: true, data: { newVersion: result.newVersion } };
  } catch (error) {
    return unknownError(error);
  }
}

async function completedOrderForDownstream(orderId: string) {
  const order = await prisma.productionOrder.findUnique({ where: { id: orderId } });
  if (!order) return { success: false as const, code: "NOT_FOUND" as const, error: "Order not found." };
  if (order.status !== "COMPLETED") return { success: false as const, code: "VALIDATION" as const, error: "Order must be completed first." };
  return { success: true as const, data: order };
}

const downstreamReferencePrefix: Record<ProductionOrderDownstreamActionType, string> = {
  INVENTORY_CONSUMPTION: "IC",
  BATCH_RECORD: "BATCH",
  LABEL_PRINT: "LABEL"
};

async function recordDownstreamAction(
  orderId: string,
  actionType: ProductionOrderDownstreamActionType
): Promise<ActionResult<{ id: string; referenceId: string; alreadyRecorded: boolean }>> {
  try {
    const session = await getServerSession();
    requireProductionPermission(session.user.permissions, COMPLETE_PRODUCTION_ORDERS);
    const orderResult = await completedOrderForDownstream(orderId);
    if (!orderResult.success) return orderResult;
    const record = await prisma.$transaction(async (tx) => {
      const existing = await tx.productionOrderDownstreamAction.findUnique({
        where: { orderId_actionType: { orderId, actionType } }
      });
      if (existing) return { ...existing, alreadyRecorded: true };

      const referenceId = `${downstreamReferencePrefix[actionType]}-${orderResult.data.orderNumber}`;
      const created = await tx.productionOrderDownstreamAction.create({
        data: {
          orderId,
          actionType,
          referenceId,
          triggeredById: session.user.id,
          payload: {
            orderId,
            orderNumber: orderResult.data.orderNumber,
            recipeVersionId: orderResult.data.recipeVersionId,
            producedQuantity: orderResult.data.producedQuantity?.toString() ?? null,
            yieldUnit: orderResult.data.yieldUnit,
            completedAt: orderResult.data.completedAt?.toISOString() ?? null
          }
        }
      });
      await writeProductionAuditLog(tx, {
        action: "PRODUCTION_ORDER_COMPLETED",
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? session.user.id,
        orderId,
        orderNumber: orderResult.data.orderNumber,
        newValue: { downstreamAction: actionType, referenceId, orderId }
      });
      return { ...created, alreadyRecorded: false };
    });
    productionPaths();
    return { success: true, data: { id: record.id, referenceId: record.referenceId ?? "", alreadyRecorded: record.alreadyRecorded } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function triggerInventoryConsumption(orderId: string) {
  return recordDownstreamAction(orderId, "INVENTORY_CONSUMPTION");
}

export async function createBatchRecord(orderId: string) {
  return recordDownstreamAction(orderId, "BATCH_RECORD");
}

export async function triggerLabelPrint(orderId: string) {
  return recordDownstreamAction(orderId, "LABEL_PRINT");
}
