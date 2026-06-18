import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SEARCH_SOURCES, type SearchSource, type SearchSuggestion } from "@/features/search/types";
import type { PermissionCode } from "@/features/permissions/types";

const LIMIT = 10;

function startsWith(value: string) {
  return value ? { startsWith: value, mode: "insensitive" as const } : undefined;
}

function canUseSource(source: SearchSource, permissions: string[]) {
  const has = (...codes: PermissionCode[]) => codes.some((code) => permissions.includes(code));
  if (source === "users" || source === "user-ids") return has("users:view", "audit:view", "reports:view", "recipes:manage_scope", "production-orders:assign");
  if (source === "departments" || source === "production-lines") return has("recipes:manage_scope", "settings:view", "system:configure");
  if (source === "recipes") return has("recipes:view", "production-orders:view", "production-orders:view_all", "reports:view");
  if (source === "production-orders") return has("production-orders:view", "production-orders:view_all", "reports:view");
  if (source === "batches") return has("inventory:view", "production-orders:view", "production-orders:view_all", "reports:view");
  if (source === "printing") return has("printing:view", "printing:create", "printing:reprint", "system:configure");
  return has("inventory:view", "inventory:manage", "recipes:edit", "recipes:create", "reports:view");
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    const url = new URL(request.url);
    const sourceValue = url.searchParams.get("source") ?? "";
    if (!SEARCH_SOURCES.includes(sourceValue as SearchSource)) return NextResponse.json({ suggestions: [] }, { status: 400 });
    const source = sourceValue as SearchSource;
    if (!canUseSource(source, session.user.permissions)) return NextResponse.json({ suggestions: [] }, { status: 403 });
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    return NextResponse.json({ suggestions: await suggestionsFor(source, query) });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ suggestions: [] }, { status });
  }
}

async function suggestionsFor(source: SearchSource, query: string): Promise<SearchSuggestion[]> {
  if (source === "inventory-items" || source === "inventory-item-ids") {
    const match = startsWith(query);
    const rows = await prisma.inventoryItem.findMany({
      where: match ? { OR: [{ code: match }, { nameEn: match }, { nameAr: match }] } : { isActive: true },
      select: { id: true, code: true, nameEn: true, nameAr: true, unit: true },
      orderBy: { code: "asc" },
      take: LIMIT
    });
    return rows.map((row) => ({ value: source === "inventory-item-ids" ? row.id : row.code, label: `${row.code} — ${row.nameEn || row.nameAr}`, description: row.unit }));
  }
  if (source === "recipes") {
    const match = startsWith(query);
    const rows = await prisma.recipe.findMany({
      where: match ? { OR: [{ code: match }, { nameEn: match }, { nameAr: match }] } : {},
      select: { code: true, nameEn: true, nameAr: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: LIMIT
    });
    return rows.map((row) => ({ value: row.code, label: `${row.code} — ${row.nameEn || row.nameAr}`, description: row.status }));
  }
  if (source === "production-orders") {
    const match = startsWith(query);
    const rows = await prisma.productionOrder.findMany({
      where: match ? { OR: [{ orderNumber: match }, { recipeNameSnapshot: match }] } : {},
      select: { orderNumber: true, recipeNameSnapshot: true, status: true },
      orderBy: { createdAt: "desc" },
      take: LIMIT
    });
    return rows.map((row) => ({ value: row.orderNumber, label: `${row.orderNumber} — ${row.recipeNameSnapshot}`, description: row.status }));
  }
  if (source === "batches") {
    const match = startsWith(query);
    const rows = await prisma.productionBatch.findMany({
      where: match ? { OR: [{ batchNumber: match }, { recipe: { code: match } }, { recipe: { nameEn: match } }, { recipe: { nameAr: match } }] } : {},
      select: { batchNumber: true, status: true, recipe: { select: { code: true, nameEn: true, nameAr: true } } },
      orderBy: { createdAt: "desc" },
      take: LIMIT
    });
    return rows.map((row) => ({ value: row.batchNumber, label: `${row.batchNumber} — ${row.recipe.nameEn || row.recipe.nameAr}`, description: `${row.recipe.code} · ${row.status}` }));
  }
  if (source === "users" || source === "user-ids") {
    const match = startsWith(query);
    const rows = await prisma.user.findMany({
      where: { isActive: true, ...(match ? { OR: [{ displayName: match }, { username: match }, { email: match }] } : {}) },
      select: { id: true, displayName: true, username: true, email: true },
      orderBy: { displayName: "asc" },
      take: LIMIT
    });
    return rows.map((row) => ({ value: source === "user-ids" ? row.id : row.displayName, label: row.displayName, description: row.email || row.username }));
  }
  if (source === "departments" || source === "production-lines") {
    const match = startsWith(query);
    const rows = source === "departments"
      ? await prisma.department.findMany({ where: { isActive: true, ...(match ? { name: match } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: LIMIT })
      : await prisma.productionLine.findMany({ where: { isActive: true, ...(match ? { name: match } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: LIMIT });
    return rows.map((row) => ({ value: row.id, label: row.name }));
  }
  const match = startsWith(query);
  const rows = await prisma.printJob.findMany({
    where: match ? { OR: [{ targetId: match }, { printer: { name: match } }, { createdBy: { displayName: match } }] } : {},
    select: { targetId: true, targetType: true, printer: { select: { name: true } }, createdBy: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: LIMIT
  });
  return rows.map((row) => ({ value: row.targetId, label: `${row.targetType} — ${row.targetId}`, description: `${row.printer?.name ?? "Browser default"} · ${row.createdBy.displayName}` }));
}
