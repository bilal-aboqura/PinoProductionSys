import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { generateItemReferenceTemplate, parseItemReferenceWorkbook } from "@/features/inventory/item-reference-excel";
import { importItemReferenceRows } from "@/features/inventory/item-reference-import-service";
import { getServerSession } from "@/lib/auth";
import { MANAGE_INGREDIENT_REFERENCES, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const maxFileBytes = 5 * 1024 * 1024;

function apiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ success: false, error: "You must sign in to continue." }, { status: 401 });
  }
  if (error instanceof Error && error.message === "PERMISSION_DENIED") {
    return NextResponse.json({ success: false, error: "You do not have permission for this action." }, { status: 403 });
  }
  console.error("Item reference Excel operation failed", error);
  return NextResponse.json({ success: false, error: "The Excel operation could not be completed." }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    requirePermission(session, MANAGE_INGREDIENT_REFERENCES);
    const [items, categories] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: { code: true, nameEn: true, nameAr: true, unit: true, itemType: true, category: { select: { name: true } } },
        orderBy: [{ nameEn: "asc" }, { code: "asc" }]
      }),
      prisma.inventoryCategory.findMany({ select: { name: true }, orderBy: { name: "asc" } })
    ]);
    const body = await generateItemReferenceTemplate(
      items.map((item) => ({ ...item, categoryName: item.category.name })),
      categories.map((category) => category.name),
      request.nextUrl.searchParams.get("locale") ?? "en"
    );
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pino-item-reference-template-${new Date().toISOString().slice(0, 10)}.xlsx"`
      }
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    requirePermission(session, MANAGE_INGREDIENT_REFERENCES);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "An Excel file is required." }, { status: 400 });
    }
    if (!file.name.toLocaleLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ success: false, error: "Only .xlsx files are accepted." }, { status: 400 });
    }
    if (file.size > maxFileBytes) {
      return NextResponse.json({ success: false, error: "The Excel file must be 5 MB or smaller." }, { status: 400 });
    }

    const generalPreferences = await prisma.systemSetting.findUnique({ where: { key: "general_preferences" }, select: { value: true } });
    const preferences = generalPreferences?.value && typeof generalPreferences.value === "object" && !Array.isArray(generalPreferences.value)
      ? generalPreferences.value as Record<string, unknown>
      : {};
    const timeZone = typeof preferences.timeZone === "string" ? preferences.timeZone : "Africa/Cairo";
    const parsed = await parseItemReferenceWorkbook(Buffer.from(await file.arrayBuffer()), timeZone);
    if (parsed.errors.length > 0) {
      return NextResponse.json({ success: false, errors: parsed.errors }, { status: 422 });
    }
    const result = await importItemReferenceRows(parsed.rows, session.user.id);
    if (result.errors.length > 0) {
      return NextResponse.json({ success: false, errors: result.errors }, { status: 422 });
    }

    revalidatePath("/[locale]/inventory/items", "page");
    revalidatePath("/[locale]/inventory", "page");
    return NextResponse.json({ success: true, importedRowCount: result.importedRowCount, createdItemCount: result.createdItemCount });
  } catch (error) {
    return apiError(error);
  }
}
