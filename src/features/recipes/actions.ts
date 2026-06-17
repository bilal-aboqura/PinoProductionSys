"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type RecipeStatus, type ScopeType } from "@prisma/client";
import { z } from "zod";
import { buildRecipeSnapshot, type RecipeSnapshot } from "@/lib/recipes/snapshot";
import { validateRecipeForPublish } from "@/lib/recipes/validate-publish";
import { writeAuditLog } from "@/lib/recipes/audit";
import type { ActionResult } from "@/lib/types/action-result";
import { getServerSession } from "@/lib/auth";
import { MANAGE_RECIPE_CATEGORIES, MANAGE_RECIPE_SCOPE, VIEW_VERSION_HISTORY, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { paginationInput, totalPages } from "@/lib/pagination";
import type {
  ActiveOrderSummary,
  RecipeAssignmentDto,
  RecipeCategoryDto,
  RecipeDetailDto,
  RecipeIngredientDto,
  RecipeListItemDto,
  RecipeSortKey,
  RecipeStepDto,
  RecipeVersionDto,
  RecipeVersionSummaryDto
} from "./types";

const categorySchema = z.object({
  nameAr: z.string().trim().min(2).max(100),
  nameEn: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional()
});

const categoryUpdateSchema = categorySchema.partial();

const recipeInputSchema = z.object({
  nameAr: z.string().trim().min(1).max(200).optional(),
  nameEn: z.string().trim().max(200).optional(),
  code: z.string().trim().regex(/^RCP-\d{3,6}$/i).optional().or(z.literal("")),
  categoryId: z.string().optional().nullable().or(z.literal("")),
  description: z.string().trim().max(1000).optional().nullable(),
  yieldQuantity: z.coerce.number().min(0).optional(),
  yieldUnit: z.enum(["KG", "GRAM", "LITER", "MILLILITER", "PIECE"]).optional(),
  shelfLifeValue: z.coerce.number().int().min(0).optional(),
  shelfLifeUnit: z.enum(["HOURS", "DAYS", "WEEKS", "MONTHS"]).optional(),
  storageMethod: z.enum(["REFRIGERATOR", "FREEZER", "ROOM_TEMPERATURE", "CUSTOM"]).optional(),
  storageNotes: z.string().trim().max(1000).optional().nullable(),
  productionNotes: z.string().trim().max(4000).optional().nullable()
});

const ingredientSchema = z.object({
  inventoryItemId: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(40),
  purpose: z.string().trim().max(200).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional()
});

const ingredientUpdateSchema = ingredientSchema.partial();

const stepSchema = z.object({
  stepNumber: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().min(1).max(4000),
  estimatedMinutes: z.coerce.number().int().positive().optional().nullable(),
  requiresPhoto: z.coerce.boolean().optional(),
  requiresNotes: z.coerce.boolean().optional()
});

const stepUpdateSchema = stepSchema.partial();

const scopeSchema = z.object({
  scopeType: z.enum(["DEPARTMENT", "PRODUCTION_LINE", "USER"]),
  scopeId: z.string().trim().min(1)
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

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function pathsToRevalidate() {
  revalidatePath("/[locale]/recipes", "page");
  revalidatePath("/[locale]/recipes/[id]", "page");
  revalidatePath("/[locale]/recipes/categories", "page");
}

async function sessionWithPermission(permission: Parameters<typeof requirePermission>[1]) {
  const session = await getServerSession();
  requirePermission(session, permission);
  return session;
}

function toCategoryDto(category: {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string | null;
  isActive: boolean;
  sortOrder?: number;
}): RecipeCategoryDto {
  return {
    id: category.id,
    nameAr: category.nameAr || category.name,
    nameEn: category.nameEn || category.name,
    description: category.description ?? null,
    isActive: category.isActive,
    sortOrder: category.sortOrder ?? 0
  };
}

function toIngredientDto(ingredient: {
  id: string;
  inventoryItemId: string;
  quantity: Prisma.Decimal;
  unit: string;
  purpose: string | null;
  sortOrder: number;
}): RecipeIngredientDto {
  return {
    id: ingredient.id,
    inventoryItemId: ingredient.inventoryItemId,
    quantity: ingredient.quantity.toString(),
    unit: ingredient.unit,
    purpose: ingredient.purpose,
    sortOrder: ingredient.sortOrder
  };
}

function toStepDto(step: {
  id: string;
  stepNumber: number;
  title: string;
  instructions: string;
  estimatedMinutes: number | null;
  requiresPhoto: boolean;
  requiresNotes: boolean;
}): RecipeStepDto {
  return step;
}

function toAssignmentDto(assignment: { id: string; scopeType: ScopeType; scopeId: string; assignedAt: Date }): RecipeAssignmentDto {
  return {
    id: assignment.id,
    scopeType: assignment.scopeType,
    scopeId: assignment.scopeId,
    assignedAt: assignment.assignedAt.toISOString()
  };
}

function toListItem(recipe: {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  status: RecipeStatus;
  category: { name: string; nameAr: string; nameEn: string } | null;
  yieldQuantity: Prisma.Decimal;
  yieldUnit: RecipeListItemDto["yieldUnit"];
  shelfLifeValue: number;
  shelfLifeUnit: RecipeListItemDto["shelfLifeUnit"];
  storageMethod: RecipeListItemDto["storageMethod"];
  publishedVersion: number;
  publishedAt: Date | null;
  updatedAt: Date;
}): RecipeListItemDto {
  return {
    id: recipe.id,
    nameAr: recipe.nameAr,
    nameEn: recipe.nameEn,
    code: recipe.code,
    status: recipe.status,
    categoryNameAr: recipe.category?.nameAr || recipe.category?.name || null,
    categoryNameEn: recipe.category?.nameEn || recipe.category?.name || null,
    yieldQuantity: recipe.yieldQuantity.toString(),
    yieldUnit: recipe.yieldUnit,
    shelfLifeValue: recipe.shelfLifeValue,
    shelfLifeUnit: recipe.shelfLifeUnit,
    storageMethod: recipe.storageMethod,
    publishedVersion: recipe.publishedVersion,
    publishedAt: recipe.publishedAt?.toISOString() ?? null,
    updatedAt: recipe.updatedAt.toISOString()
  };
}

async function nextRecipeCode() {
  const recipes = await prisma.recipe.findMany({
    where: { code: { startsWith: "RCP-" } },
    select: { code: true }
  });
  const max = recipes.reduce((highest, recipe) => {
    const value = Number(recipe.code.match(/^RCP-(\d+)$/i)?.[1] ?? 0);
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);
  return `RCP-${String(max + 1).padStart(4, "0")}`;
}

export async function listRecipeCategories(): Promise<ActionResult<RecipeCategoryDto[]>> {
  try {
    const categories = await prisma.recipeCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });
    return { success: true, data: categories.map(toCategoryDto) };
  } catch (error) {
    return unknownError(error);
  }
}

export async function createRecipeCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await sessionWithPermission(MANAGE_RECIPE_CATEGORIES);
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));

    const category = await prisma.recipeCategory.create({
      data: {
        name: parsed.data.nameEn,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        description: parsed.data.description,
        sortOrder: parsed.data.sortOrder ?? 0
      }
    });
    void session;
    pathsToRevalidate();
    return { success: true, data: { id: category.id } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function updateRecipeCategory(id: string, input: unknown): Promise<ActionResult> {
  try {
    await sessionWithPermission(MANAGE_RECIPE_CATEGORIES);
    const parsed = categoryUpdateSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));

    const existing = await prisma.recipeCategory.findUnique({ where: { id } });
    if (!existing) return { success: false, code: "NOT_FOUND", error: "Category not found." };

    await prisma.recipeCategory.update({
      where: { id },
      data: {
        ...parsed.data,
        name: parsed.data.nameEn ?? existing.name
      }
    });
    pathsToRevalidate();
    return { success: true, data: undefined };
  } catch (error) {
    return unknownError(error);
  }
}

export async function archiveRecipeCategory(id: string): Promise<ActionResult> {
  try {
    await sessionWithPermission(MANAGE_RECIPE_CATEGORIES);
    await prisma.recipeCategory.update({ where: { id }, data: { isActive: false } });
    pathsToRevalidate();
    return { success: true, data: undefined };
  } catch (error) {
    return unknownError(error);
  }
}

export async function createRecipe(input: unknown): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const session = await getServerSession();
    const parsed = recipeInputSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));

    const code = parsed.data.code || (await nextRecipeCode());
    const recipe = await prisma.$transaction(async (tx) => {
      const created = await tx.recipe.create({
        data: {
          nameAr: parsed.data.nameAr || "Untitled recipe",
          nameEn: parsed.data.nameEn ?? "",
          code,
          categoryId: parsed.data.categoryId || null,
          description: parsed.data.description,
          yieldQuantity: parsed.data.yieldQuantity ?? 0,
          yieldUnit: parsed.data.yieldUnit ?? "KG",
          shelfLifeValue: parsed.data.shelfLifeValue ?? 0,
          shelfLifeUnit: parsed.data.shelfLifeUnit ?? "DAYS",
          storageMethod: parsed.data.storageMethod ?? "ROOM_TEMPERATURE",
          storageNotes: parsed.data.storageNotes,
          productionNotes: parsed.data.productionNotes,
          createdById: session.user.id,
          updatedById: session.user.id
        }
      });
      await writeAuditLog(tx, {
        recipeId: created.id,
        action: "RECIPE_CREATED",
        actorId: session.user.id,
        newValue: toJson(created)
      });
      return created;
    });

    pathsToRevalidate();
    return { success: true, data: { id: recipe.id, code: recipe.code } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function saveDraft(id: string, input: unknown, version: number): Promise<ActionResult<{ newVersion: number }>> {
  try {
    const session = await getServerSession();
    const parsed = recipeInputSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.recipe.findUnique({ where: { id } });
      if (!existing) return { kind: "missing" as const };
      if (existing.version !== version) return { kind: "conflict" as const };

      const data: Prisma.RecipeUpdateInput = {
        nameAr: parsed.data.nameAr ?? existing.nameAr,
        nameEn: parsed.data.nameEn ?? existing.nameEn,
        code: parsed.data.code || existing.code,
        category: parsed.data.categoryId === undefined ? undefined : parsed.data.categoryId ? { connect: { id: parsed.data.categoryId } } : { disconnect: true },
        description: parsed.data.description,
        yieldQuantity: parsed.data.yieldQuantity,
        yieldUnit: parsed.data.yieldUnit,
        shelfLifeValue: parsed.data.shelfLifeValue,
        shelfLifeUnit: parsed.data.shelfLifeUnit,
        storageMethod: parsed.data.storageMethod,
        storageNotes: parsed.data.storageNotes,
        productionNotes: parsed.data.productionNotes,
        status: existing.status === "ACTIVE" ? "DRAFT" : existing.status,
        version: { increment: 1 },
        updatedById: session.user.id
      };

      const updated = await tx.recipe.update({ where: { id }, data });
      await writeAuditLog(tx, {
        recipeId: id,
        action: "DRAFT_SAVED",
        actorId: session.user.id,
        prevValue: toJson(existing),
        newValue: toJson(updated)
      });
      return { kind: "saved" as const, version: updated.version };
    });

    if (result.kind === "missing") return { success: false, code: "NOT_FOUND", error: "Recipe not found." };
    if (result.kind === "conflict") return { success: false, code: "CONFLICT", error: "This recipe was modified by another user." };
    pathsToRevalidate();
    return { success: true, data: { newVersion: result.version } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function getRecipe(id: string): Promise<ActionResult<RecipeDetailDto>> {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        category: true,
        ingredients: { orderBy: { sortOrder: "asc" } },
        steps: { orderBy: { stepNumber: "asc" } },
        assignments: { orderBy: { assignedAt: "asc" } }
      }
    });
    if (!recipe) return { success: false, code: "NOT_FOUND", error: "Recipe not found." };

    const assignments = recipe.assignments.map(toAssignmentDto);

    const item = toListItem(recipe);
    return {
      success: true,
      data: {
        ...item,
        category: recipe.category
          ? { id: recipe.category.id, nameAr: recipe.category.nameAr || recipe.category.name, nameEn: recipe.category.nameEn || recipe.category.name }
          : null,
        description: recipe.description,
        storageNotes: recipe.storageNotes,
        productionNotes: recipe.productionNotes,
        version: recipe.version,
        createdAt: recipe.createdAt.toISOString(),
        ingredients: recipe.ingredients.map(toIngredientDto),
        steps: recipe.steps.map(toStepDto),
        assignments
      }
    };
  } catch (error) {
    return unknownError(error);
  }
}

export async function listRecipes(
  filters: {
    search?: string;
    categoryId?: string;
    status?: RecipeStatus | RecipeStatus[];
    departmentId?: string;
    productionLineId?: string;
    sort?: RecipeSortKey;
  } = {},
  pagination: { page?: number; pageSize?: number } = {}
): Promise<ActionResult<{ items: RecipeListItemDto[]; total: number; page: number; pageSize: number; totalPages: number }>> {
  try {
    const { page, pageSize, skip, take } = paginationInput(pagination.page, pagination.pageSize);
    const andFilters: Prisma.RecipeWhereInput[] = [];

    if (filters.search?.trim()) {
      andFilters.push({
        OR: [
          { nameAr: { contains: filters.search.trim(), mode: "insensitive" } },
          { nameEn: { contains: filters.search.trim(), mode: "insensitive" } },
          { code: { contains: filters.search.trim(), mode: "insensitive" } }
        ]
      });
    }
    if (filters.categoryId) andFilters.push({ categoryId: filters.categoryId });
    if (filters.status) andFilters.push({ status: Array.isArray(filters.status) ? { in: filters.status } : filters.status });
    if (filters.departmentId) andFilters.push({ assignments: { some: { scopeType: "DEPARTMENT", scopeId: filters.departmentId } } });
    if (filters.productionLineId) andFilters.push({ assignments: { some: { scopeType: "PRODUCTION_LINE", scopeId: filters.productionLineId } } });
    const where: Prisma.RecipeWhereInput = andFilters.length ? { AND: andFilters } : {};

    const orderBy: Prisma.RecipeOrderByWithRelationInput =
      filters.sort === "nameAr"
        ? { nameAr: "asc" }
        : filters.sort === "nameEn"
          ? { nameEn: "asc" }
          : filters.sort === "publishedAt"
            ? { publishedAt: "desc" }
            : filters.sort === "category"
              ? { category: { nameEn: "asc" } }
              : { updatedAt: "desc" };

    const [items, total] = await Promise.all([
      prisma.recipe.findMany({ where, include: { category: true }, orderBy, skip, take }),
      prisma.recipe.count({ where })
    ]);
    return {
      success: true,
      data: {
        items: items.map(toListItem),
        total,
        page,
        pageSize,
        totalPages: totalPages(total, pageSize)
      }
    };
  } catch (error) {
    return unknownError(error);
  }
}

export async function publishRecipe(id: string, version: number): Promise<ActionResult<{ publishedVersion: number }>> {
  try {
    const session = await getServerSession();
    const recipe = await prisma.recipe.findUnique({ where: { id } });
    if (!recipe) return { success: false, code: "NOT_FOUND", error: "Recipe not found." };
    if (recipe.version !== version) return { success: false, code: "CONFLICT", error: "This recipe was modified by another user." };

    const validation = await validateRecipeForPublish(id);
    if (!validation.valid) return validationError(validation.errors);

    const snapshot = await buildRecipeSnapshot(id);
    const publishedAt = new Date();
    const versionNumber = recipe.publishedVersion + 1;
    const finalSnapshot: RecipeSnapshot = {
      ...snapshot,
      versionNumber,
      publishedAt: publishedAt.toISOString(),
      publishedById: session.user.id
    };

    await prisma.$transaction(async (tx) => {
      const updated = await tx.recipe.update({
        where: { id },
        data: {
          status: "ACTIVE",
          version: { increment: 1 },
          publishedVersion: versionNumber,
          publishedAt,
          publishedById: session.user.id,
          updatedById: session.user.id
        }
      });
      await tx.recipeVersion.create({
        data: {
          recipeId: id,
          versionNumber,
          snapshot: toJson(finalSnapshot),
          publishedById: session.user.id,
          publishedAt
        }
      });
      await writeAuditLog(tx, {
        recipeId: id,
        action: "PUBLISHED",
        actorId: session.user.id,
        prevValue: toJson(recipe),
        newValue: toJson(updated)
      });
    });

    pathsToRevalidate();
    return { success: true, data: { publishedVersion: versionNumber } };
  } catch (error) {
    return unknownError(error);
  }
}

async function mutateRecipeChild<T>(
  recipeId: string,
  recipeVersion: number,
  permissionAction: (tx: Prisma.TransactionClient, existing: { version: number }) => Promise<T>
): Promise<ActionResult<T & { newVersion: number }>> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.recipe.findUnique({ where: { id: recipeId }, select: { version: true } });
      if (!existing) return { kind: "missing" as const };
      if (existing.version !== recipeVersion) return { kind: "conflict" as const };
      const data = await permissionAction(tx, existing);
      const updated = await tx.recipe.update({
        where: { id: recipeId },
        data: { version: { increment: 1 }, status: "DRAFT" }
      });
      return { kind: "saved" as const, data: { ...data, newVersion: updated.version } };
    });
    if (result.kind === "missing") return { success: false, code: "NOT_FOUND", error: "Recipe not found." };
    if (result.kind === "conflict") return { success: false, code: "CONFLICT", error: "This recipe was modified by another user." };
    pathsToRevalidate();
    return { success: true, data: result.data };
  } catch (error) {
    return unknownError(error);
  }
}

export async function addIngredient(recipeId: string, input: unknown, recipeVersion: number) {
  const parsed = ingredientSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));
  const session = await getServerSession();
  return mutateRecipeChild(recipeId, recipeVersion, async (tx) => {
    const duplicate = await tx.recipeIngredient.count({ where: { recipeId, inventoryItemId: parsed.data.inventoryItemId } });
    const ingredient = await tx.recipeIngredient.create({ data: { recipeId, ...parsed.data } });
    await writeAuditLog(tx, {
      recipeId,
      action: "INGREDIENT_ADDED",
      actorId: session.user.id,
      newValue: toJson(ingredient)
    });
    return { id: ingredient.id, hasDuplicate: duplicate > 0 };
  });
}

export async function updateIngredient(recipeId: string, ingredientId: string, input: unknown, recipeVersion: number) {
  const parsed = ingredientUpdateSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));
  const session = await getServerSession();
  return mutateRecipeChild(recipeId, recipeVersion, async (tx) => {
    const existing = await tx.recipeIngredient.findUnique({ where: { id: ingredientId } });
    if (!existing || existing.recipeId !== recipeId) throw new Error("Ingredient not found.");
    const updated = await tx.recipeIngredient.update({ where: { id: ingredientId }, data: parsed.data });
    await writeAuditLog(tx, {
      recipeId,
      action: "INGREDIENT_UPDATED",
      actorId: session.user.id,
      prevValue: toJson(existing),
      newValue: toJson(updated)
    });
    return {};
  });
}

export async function removeIngredient(recipeId: string, ingredientId: string, recipeVersion: number) {
  const session = await getServerSession();
  return mutateRecipeChild(recipeId, recipeVersion, async (tx) => {
    const existing = await tx.recipeIngredient.delete({ where: { id: ingredientId } });
    await writeAuditLog(tx, {
      recipeId,
      action: "INGREDIENT_REMOVED",
      actorId: session.user.id,
      prevValue: toJson(existing)
    });
    return {};
  });
}

export async function reorderIngredients(recipeId: string, orderedIds: string[], recipeVersion: number) {
  const session = await getServerSession();
  return mutateRecipeChild(recipeId, recipeVersion, async (tx) => {
    await Promise.all(orderedIds.map((id, index) => tx.recipeIngredient.update({ where: { id }, data: { sortOrder: index + 1 } })));
    await writeAuditLog(tx, {
      recipeId,
      action: "INGREDIENT_UPDATED",
      actorId: session.user.id,
      newValue: toJson({ orderedIds })
    });
    return {};
  });
}

export async function addStep(recipeId: string, input: unknown, recipeVersion: number) {
  const parsed = stepSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));
  const session = await getServerSession();
  return mutateRecipeChild(recipeId, recipeVersion, async (tx) => {
    const step = await tx.recipeStep.create({ data: { recipeId, ...parsed.data } });
    await writeAuditLog(tx, {
      recipeId,
      action: "STEP_ADDED",
      actorId: session.user.id,
      newValue: toJson(step)
    });
    return { id: step.id };
  });
}

export async function updateStep(recipeId: string, stepId: string, input: unknown, recipeVersion: number) {
  const parsed = stepUpdateSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));
  const session = await getServerSession();
  return mutateRecipeChild(recipeId, recipeVersion, async (tx) => {
    const existing = await tx.recipeStep.findUnique({ where: { id: stepId } });
    if (!existing || existing.recipeId !== recipeId) throw new Error("Step not found.");
    const updated = await tx.recipeStep.update({ where: { id: stepId }, data: parsed.data });
    await writeAuditLog(tx, {
      recipeId,
      action: "STEP_UPDATED",
      actorId: session.user.id,
      prevValue: toJson(existing),
      newValue: toJson(updated)
    });
    return {};
  });
}

export async function deleteStep(recipeId: string, stepId: string, recipeVersion: number) {
  const session = await getServerSession();
  return mutateRecipeChild(recipeId, recipeVersion, async (tx) => {
    const count = await tx.recipeStep.count({ where: { recipeId } });
    const existing = await tx.recipeStep.delete({ where: { id: stepId } });
    await writeAuditLog(tx, {
      recipeId,
      action: "STEP_REMOVED",
      actorId: session.user.id,
      prevValue: toJson(existing)
    });
    return { lastStep: count <= 1 };
  });
}

export async function reorderSteps(recipeId: string, orderedIds: string[], recipeVersion: number) {
  const session = await getServerSession();
  return mutateRecipeChild(recipeId, recipeVersion, async (tx) => {
    await Promise.all(orderedIds.map((id, index) => tx.recipeStep.update({ where: { id }, data: { stepNumber: index + 1 } })));
    await writeAuditLog(tx, {
      recipeId,
      action: "STEP_UPDATED",
      actorId: session.user.id,
      newValue: toJson({ orderedIds })
    });
    return {};
  });
}

export async function getRecipeVersionHistory(id: string): Promise<ActionResult<RecipeVersionSummaryDto[]>> {
  try {
    await sessionWithPermission(VIEW_VERSION_HISTORY);
    const versions = await prisma.recipeVersion.findMany({ where: { recipeId: id }, orderBy: { versionNumber: "desc" }, take: 50 });
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(new Set(versions.map((version) => version.publishedById))) } },
      select: { id: true, displayName: true }
    });
    const names = new Map(users.map((user) => [user.id, user.displayName]));
    return {
      success: true,
      data: versions.map((version) => ({
        versionNumber: version.versionNumber,
        publishedAt: version.publishedAt.toISOString(),
        publishedByName: names.get(version.publishedById) ?? "Unknown"
      }))
    };
  } catch (error) {
    return unknownError(error);
  }
}

export async function getRecipeVersion(id: string, versionNumber: number): Promise<ActionResult<RecipeVersionDto>> {
  try {
    await sessionWithPermission(VIEW_VERSION_HISTORY);
    const version = await prisma.recipeVersion.findUnique({ where: { recipeId_versionNumber: { recipeId: id, versionNumber } } });
    if (!version) return { success: false, code: "NOT_FOUND", error: "Version not found." };
    const user = await prisma.user.findUnique({ where: { id: version.publishedById }, select: { displayName: true } });
    return {
      success: true,
      data: {
        versionNumber: version.versionNumber,
        publishedAt: version.publishedAt.toISOString(),
        publishedByName: user?.displayName ?? "Unknown",
        snapshot: version.snapshot as RecipeSnapshot
      }
    };
  } catch (error) {
    return unknownError(error);
  }
}

export async function archiveRecipe(
  id: string,
  force = false
): Promise<ActionResult<{ archived: true } | { warning: true; affectedOrders: ActiveOrderSummary[] }>> {
  try {
    const session = await getServerSession();
    const affectedOrders: ActiveOrderSummary[] = [];
    if (!force && affectedOrders.length > 0) return { success: true, data: { warning: true, affectedOrders } };

    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) return { success: false, code: "NOT_FOUND", error: "Recipe not found." };

    await prisma.$transaction(async (tx) => {
      const updated = await tx.recipe.update({ where: { id }, data: { status: "ARCHIVED", updatedById: session.user.id } });
      await writeAuditLog(tx, {
        recipeId: id,
        action: "ARCHIVED",
        actorId: session.user.id,
        prevValue: toJson(existing),
        newValue: toJson(updated)
      });
    });
    pathsToRevalidate();
    return { success: true, data: { archived: true } };
  } catch (error) {
    return unknownError(error);
  }
}

export async function restoreRecipe(id: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) return { success: false, code: "NOT_FOUND", error: "Recipe not found." };
    await prisma.$transaction(async (tx) => {
      const updated = await tx.recipe.update({ where: { id }, data: { status: "ACTIVE", updatedById: session.user.id } });
      await writeAuditLog(tx, {
        recipeId: id,
        action: "RESTORED",
        actorId: session.user.id,
        prevValue: toJson(existing),
        newValue: toJson(updated)
      });
    });
    pathsToRevalidate();
    return { success: true, data: undefined };
  } catch (error) {
    return unknownError(error);
  }
}

export async function assignScope(recipeId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await sessionWithPermission(MANAGE_RECIPE_SCOPE);
    const parsed = scopeSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error.issues.map((issue) => issue.message));
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.recipeAssignment.upsert({
        where: {
          recipeId_scopeType_scopeId: {
            recipeId,
            scopeType: parsed.data.scopeType,
            scopeId: parsed.data.scopeId
          }
        },
        update: {},
        create: {
          recipeId,
          scopeType: parsed.data.scopeType,
          scopeId: parsed.data.scopeId,
          assignedById: session.user.id
        }
      });
      await writeAuditLog(tx, {
        recipeId,
        action: "RECIPE_SCOPE_ASSIGNED",
        actorId: session.user.id,
        newValue: toJson(assignment)
      });
    });
    pathsToRevalidate();
    return { success: true, data: undefined };
  } catch (error) {
    return unknownError(error);
  }
}

export async function removeScope(recipeId: string, assignmentId: string): Promise<ActionResult> {
  try {
    const session = await sessionWithPermission(MANAGE_RECIPE_SCOPE);
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.recipeAssignment.delete({ where: { id: assignmentId } });
      await writeAuditLog(tx, {
        recipeId,
        action: "RECIPE_SCOPE_REMOVED",
        actorId: session.user.id,
        prevValue: toJson(assignment)
      });
    });
    pathsToRevalidate();
    return { success: true, data: undefined };
  } catch (error) {
    return unknownError(error);
  }
}

export async function listRecipeAuditLogs(recipeId: string) {
  const session = await sessionWithPermission(VIEW_VERSION_HISTORY);
  void session;
  return prisma.recipeAuditLog.findMany({
    where: { recipeId },
    orderBy: { timestamp: "desc" },
    take: 100
  });
}
