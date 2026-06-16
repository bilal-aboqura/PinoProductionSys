import { Prisma, type AuditAction } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MasterEntityDto, MasterEntityType, SettingsAuditLogDto, SystemSettingDto, SystemSettingKey } from "./types";

export function canViewSettings(permissions: string[]) {
  return permissions.includes("settings:view") || permissions.includes("system:configure") || permissions.includes("audit:view");
}

export function canConfigureSettings(permissions: string[]) {
  return permissions.includes("system:configure");
}

async function requireSettingsView() {
  const session = await getServerSession();
  if (!canViewSettings(session.user.permissions)) throw new Error("PERMISSION_DENIED");
  return session;
}

function decimalToString(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : value.toString();
}

function baseDto(entityType: MasterEntityType, item: { id: string; isActive: boolean; createdAt: Date; updatedAt?: Date | null }): Pick<MasterEntityDto, "id" | "entityType" | "isActive" | "createdAt" | "updatedAt"> {
  return {
    id: item.id,
    entityType,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt?.toISOString() ?? null
  };
}

export async function getMasterEntities(entityType: MasterEntityType, activeOnly = false): Promise<MasterEntityDto[]> {
  await requireSettingsView();
  const where = activeOnly ? { isActive: true } : {};

  if (entityType === "departments") {
    const items = await prisma.department.findMany({ where, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
    return items.map((item) => ({ ...baseDto(entityType, item), name: item.name, nameAr: item.nameAr, nameEn: item.nameEn, description: item.description }));
  }

  if (entityType === "production_lines") {
    const items = await prisma.productionLine.findMany({ where, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
    return items.map((item) => ({ ...baseDto(entityType, item), name: item.name, nameAr: item.nameAr, nameEn: item.nameEn, description: item.description }));
  }

  if (entityType === "warehouses") {
    const items = await prisma.warehouse.findMany({ where, orderBy: [{ isActive: "desc" }, { code: "asc" }] });
    return items.map((item) => ({ ...baseDto(entityType, item), code: item.code, name: item.name, nameAr: item.nameAr, nameEn: item.nameEn, description: item.description }));
  }

  if (entityType === "recipe_categories" || entityType === "categories") {
    const items = await prisma.recipeCategory.findMany({ where, orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }] });
    return items.map((item) => ({ ...baseDto("recipe_categories", item), name: item.name, nameAr: item.nameAr, nameEn: item.nameEn, description: item.description }));
  }

  if (entityType === "storage_conditions") {
    const items = await prisma.storageCondition.findMany({ where, orderBy: [{ isActive: "desc" }, { nameEn: "asc" }] });
    return items.map((item) => ({
      ...baseDto(entityType, item),
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      description: item.description,
      minTemperature: decimalToString(item.minTemperature),
      maxTemperature: decimalToString(item.maxTemperature)
    }));
  }

  if (entityType === "label_templates") {
    const items = await prisma.labelPrintTemplate.findMany({ where, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
    return items.map((item) => ({ ...baseDto(entityType, item), name: item.name, dimensions: item.dimensions }));
  }

  const items = await prisma.wasteReasonOption.findMany({ where, orderBy: [{ isActive: "desc" }, { code: "asc" }] });
  return items.map((item) => ({ ...baseDto("waste_reasons", item), code: item.code, nameAr: item.nameAr, nameEn: item.nameEn, description: item.description }));
}

export async function getSystemSettings(): Promise<SystemSettingDto[]> {
  await requireSettingsView();
  const settings = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  return settings.map((setting) => ({
    id: setting.id,
    key: setting.key as SystemSettingKey,
    value: setting.value as SystemSettingDto["value"],
    description: setting.description,
    updatedAt: setting.updatedAt.toISOString()
  }));
}

export async function getWasteReasonOptions(activeOnly = true) {
  await getServerSession();
  return prisma.wasteReasonOption.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { nameEn: "asc" }
  });
}

export async function getSettingsAuditLogs(params: {
  page?: number;
  pageSize?: number;
  actorId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
} = {}): Promise<{ logs: SettingsAuditLogDto[]; totalPages: number; totalCount: number }> {
  const session = await requireSettingsView();
  if (!session.user.permissions.includes("audit:view") && !canViewSettings(session.user.permissions)) throw new Error("PERMISSION_DENIED");

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const actionFilter = params.action
    ? [params.action]
    : (["SYSTEM_SETTING_UPDATED", "MASTER_DATA_CREATED", "MASTER_DATA_UPDATED", "MASTER_DATA_ARCHIVED", "MASTER_DATA_RESTORED"] as AuditAction[]);
  const where: Prisma.AuditLogWhereInput = {
    action: { in: actionFilter },
    ...(params.actorId ? { actorId: params.actorId } : {}),
    ...(params.startDate || params.endDate
      ? { createdAt: { gte: params.startDate ? new Date(params.startDate) : undefined, lte: params.endDate ? new Date(params.endDate) : undefined } }
      : {})
  };
  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.count({ where })
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      actorName: log.actorName,
      action: log.action,
      targetName: log.targetName,
      previousValue: log.previousValue,
      newValue: log.newValue,
      createdAt: log.createdAt.toISOString()
    })),
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    totalCount
  };
}
