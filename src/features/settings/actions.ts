"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type AuditAction } from "@prisma/client";
import { logAuditEvent } from "@/features/audit/lib/logger";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { diffRecords } from "./audit-diff";
import { canConfigureSettings } from "./queries";
import { schemaForMasterEntity, schemaForSystemSetting } from "./validation";
import type { MasterEntityType, SystemSettingKey } from "./types";

type MutationResult = { success: true; id?: string } | { success: false; error: string; details?: string[] };

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "PERMISSION_DENIED") return "You do not have permission for this action.";
    if (error.message === "NOT_FOUND") return "Record not found.";
    return error.message;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "A record with this code or name already exists.";
  return "Unexpected settings error.";
}

async function requireSettingsWrite() {
  const session = await getServerSession();
  if (!canConfigureSettings(session.user.permissions)) throw new Error("PERMISSION_DENIED");
  return session;
}

function asJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function revalidateSettings() {
  revalidatePath("/[locale]/admin/settings", "page");
  revalidatePath("/[locale]/admin/settings/departments", "page");
  revalidatePath("/[locale]/admin/settings/production-lines", "page");
  revalidatePath("/[locale]/admin/settings/warehouses", "page");
  revalidatePath("/[locale]/admin/settings/categories", "page");
  revalidatePath("/[locale]/admin/settings/conditions", "page");
  revalidatePath("/[locale]/admin/settings/waste-reasons", "page");
  revalidatePath("/[locale]/admin/settings/audit", "page");
}

async function auditChange(input: {
  actorId: string;
  actorName: string;
  action: AuditAction;
  entityType: MasterEntityType | "system_settings";
  targetName: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  const diff = input.previousValue && input.newValue ? diffRecords(input.previousValue, input.newValue) : null;
  await logAuditEvent({
    actorId: input.actorId,
    actorName: input.actorName,
    targetId: null,
    targetName: input.targetName,
    action: input.action,
    previousValue: diff ? { entityType: input.entityType, changedKeys: diff.changedKeys, ...diff.previousValue } : input.previousValue ?? null,
    newValue: diff ? { entityType: input.entityType, changedKeys: diff.changedKeys, ...diff.newValue } : input.newValue ?? null
  });
}

function canonicalEntityType(entityType: MasterEntityType): MasterEntityType {
  return entityType === "categories" ? "recipe_categories" : entityType;
}

function localizedPayload(data: Record<string, unknown>) {
  const nameEn = String(data.nameEn ?? data.name ?? "");
  return {
    name: String(data.name ?? nameEn),
    nameAr: String(data.nameAr ?? ""),
    nameEn,
    description: data.description ? String(data.description) : null,
    isActive: data.isActive == null ? true : Boolean(data.isActive)
  };
}

async function findMasterEntity(entityType: MasterEntityType, id: string) {
  const type = canonicalEntityType(entityType);
  if (type === "departments") return prisma.department.findUnique({ where: { id } });
  if (type === "production_lines") return prisma.productionLine.findUnique({ where: { id } });
  if (type === "warehouses") return prisma.warehouse.findUnique({ where: { id } });
  if (type === "recipe_categories") return prisma.recipeCategory.findUnique({ where: { id } });
  if (type === "storage_conditions") return prisma.storageCondition.findUnique({ where: { id } });
  if (type === "label_templates") return prisma.labelPrintTemplate.findUnique({ where: { id } });
  return prisma.wasteReasonOption.findUnique({ where: { id } });
}

async function createEntity(entityType: MasterEntityType, data: Record<string, unknown>) {
  const type = canonicalEntityType(entityType);
  if (type === "departments") return prisma.department.create({ data: localizedPayload(data) });
  if (type === "production_lines") return prisma.productionLine.create({ data: localizedPayload(data) });
  if (type === "warehouses") {
    const payload = localizedPayload(data);
    return prisma.warehouse.create({ data: { ...payload, code: String(data.code).toUpperCase(), name: payload.nameEn } });
  }
  if (type === "recipe_categories") return prisma.recipeCategory.create({ data: localizedPayload(data) });
  if (type === "storage_conditions") {
    const payload = localizedPayload(data);
    return prisma.storageCondition.create({
      data: {
        nameAr: payload.nameAr,
        nameEn: payload.nameEn,
        description: payload.description,
        minTemperature: data.minTemperature == null || data.minTemperature === "" ? null : new Prisma.Decimal(String(data.minTemperature)),
        maxTemperature: data.maxTemperature == null || data.maxTemperature === "" ? null : new Prisma.Decimal(String(data.maxTemperature)),
        isActive: payload.isActive
      }
    });
  }
  if (type === "label_templates") {
    return prisma.labelPrintTemplate.create({
      data: { name: String(data.name), dimensions: String(data.dimensions), isActive: data.isActive == null ? true : Boolean(data.isActive) }
    });
  }
  return prisma.wasteReasonOption.create({
    data: { ...localizedPayload(data), code: String(data.code).toUpperCase() }
  });
}

async function updateEntity(entityType: MasterEntityType, id: string, data: Record<string, unknown>) {
  const type = canonicalEntityType(entityType);
  if (type === "departments") return prisma.department.update({ where: { id }, data: localizedPayload(data) });
  if (type === "production_lines") return prisma.productionLine.update({ where: { id }, data: localizedPayload(data) });
  if (type === "warehouses") {
    const payload = localizedPayload(data);
    return prisma.warehouse.update({ where: { id }, data: { ...payload, code: String(data.code).toUpperCase(), name: payload.nameEn } });
  }
  if (type === "recipe_categories") return prisma.recipeCategory.update({ where: { id }, data: localizedPayload(data) });
  if (type === "storage_conditions") {
    const payload = localizedPayload(data);
    return prisma.storageCondition.update({
      where: { id },
      data: {
        nameAr: payload.nameAr,
        nameEn: payload.nameEn,
        description: payload.description,
        minTemperature: data.minTemperature == null || data.minTemperature === "" ? null : new Prisma.Decimal(String(data.minTemperature)),
        maxTemperature: data.maxTemperature == null || data.maxTemperature === "" ? null : new Prisma.Decimal(String(data.maxTemperature)),
        isActive: payload.isActive
      }
    });
  }
  if (type === "label_templates") {
    return prisma.labelPrintTemplate.update({
      where: { id },
      data: { name: String(data.name), dimensions: String(data.dimensions), isActive: data.isActive == null ? true : Boolean(data.isActive) }
    });
  }
  return prisma.wasteReasonOption.update({
    where: { id },
    data: { ...localizedPayload(data), code: String(data.code).toUpperCase() }
  });
}

async function setActive(entityType: MasterEntityType, id: string, isActive: boolean) {
  const type = canonicalEntityType(entityType);
  if (type === "departments") return prisma.department.update({ where: { id }, data: { isActive } });
  if (type === "production_lines") return prisma.productionLine.update({ where: { id }, data: { isActive } });
  if (type === "warehouses") return prisma.warehouse.update({ where: { id }, data: { isActive } });
  if (type === "recipe_categories") return prisma.recipeCategory.update({ where: { id }, data: { isActive } });
  if (type === "storage_conditions") return prisma.storageCondition.update({ where: { id }, data: { isActive } });
  if (type === "label_templates") return prisma.labelPrintTemplate.update({ where: { id }, data: { isActive } });
  return prisma.wasteReasonOption.update({ where: { id }, data: { isActive } });
}

export async function saveSystemSetting(key: SystemSettingKey, value: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSettingsWrite();
    const schema = schemaForSystemSetting(key);
    const parsed = schema.safeParse(value);
    if (!parsed.success) return { success: false, error: parsed.error.issues.map((issue) => issue.message).join(", ") };

    const previous = await prisma.systemSetting.findUnique({ where: { key } });
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: parsed.data as Prisma.InputJsonValue, updatedById: session.user.id },
      create: { key, value: parsed.data as Prisma.InputJsonValue, updatedById: session.user.id }
    });

    await auditChange({
      actorId: session.user.id,
      actorName: session.user.displayName,
      action: "SYSTEM_SETTING_UPDATED",
      entityType: "system_settings",
      targetName: key,
      previousValue: asJsonObject(previous?.value),
      newValue: asJsonObject(setting.value)
    });
    revalidateSettings();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function createMasterEntity(entityType: MasterEntityType, data: Record<string, unknown>): Promise<MutationResult> {
  try {
    const session = await requireSettingsWrite();
    const schema = schemaForMasterEntity(entityType);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return { success: false, error: "Validation failed.", details: parsed.error.issues.map((issue) => issue.message) };
    const created = await createEntity(entityType, parsed.data as Record<string, unknown>);
    await auditChange({
      actorId: session.user.id,
      actorName: session.user.displayName,
      action: "MASTER_DATA_CREATED",
      entityType,
      targetName: "name" in created ? String(created.name) : "code" in created ? String(created.code) : created.id,
      newValue: asJsonObject(created)
    });
    revalidateSettings();
    return { success: true, id: created.id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateMasterEntity(entityType: MasterEntityType, id: string, data: Record<string, unknown>): Promise<MutationResult> {
  try {
    const session = await requireSettingsWrite();
    const schema = schemaForMasterEntity(entityType);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return { success: false, error: "Validation failed.", details: parsed.error.issues.map((issue) => issue.message) };
    const previous = await findMasterEntity(entityType, id);
    if (!previous) throw new Error("NOT_FOUND");
    const updated = await updateEntity(entityType, id, parsed.data as Record<string, unknown>);
    await auditChange({
      actorId: session.user.id,
      actorName: session.user.displayName,
      action: "MASTER_DATA_UPDATED",
      entityType,
      targetName: "name" in updated ? String(updated.name) : "code" in updated ? String(updated.code) : updated.id,
      previousValue: asJsonObject(previous),
      newValue: asJsonObject(updated)
    });
    revalidateSettings();
    return { success: true, id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function archiveMasterEntity(entityType: MasterEntityType, id: string): Promise<MutationResult> {
  try {
    const session = await requireSettingsWrite();
    const previous = await findMasterEntity(entityType, id);
    if (!previous) throw new Error("NOT_FOUND");
    const updated = await setActive(entityType, id, false);
    await auditChange({
      actorId: session.user.id,
      actorName: session.user.displayName,
      action: "MASTER_DATA_ARCHIVED",
      entityType,
      targetName: "name" in updated ? String(updated.name) : "code" in updated ? String(updated.code) : updated.id,
      previousValue: asJsonObject(previous),
      newValue: asJsonObject(updated)
    });
    revalidateSettings();
    return { success: true, id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function restoreMasterEntity(entityType: MasterEntityType, id: string): Promise<MutationResult> {
  try {
    const session = await requireSettingsWrite();
    const previous = await findMasterEntity(entityType, id);
    if (!previous) throw new Error("NOT_FOUND");
    const updated = await setActive(entityType, id, true);
    await auditChange({
      actorId: session.user.id,
      actorName: session.user.displayName,
      action: "MASTER_DATA_RESTORED",
      entityType,
      targetName: "name" in updated ? String(updated.name) : "code" in updated ? String(updated.code) : updated.id,
      previousValue: asJsonObject(previous),
      newValue: asJsonObject(updated)
    });
    revalidateSettings();
    return { success: true, id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
