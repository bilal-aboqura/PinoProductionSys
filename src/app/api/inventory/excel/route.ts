import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { generateInventoryBalanceTemplate, parseInventoryBalanceWorkbook } from "@/features/inventory/inventory-balance-excel";
import { importInventoryBalanceRows } from "@/features/inventory/inventory-balance-import-service";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const maxFileBytes = 5 * 1024 * 1024;

function apiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ success: false, error: "You must sign in to continue." }, { status: 401 });
  }
  if (error instanceof Error && error.message === "PERMISSION_DENIED") {
    return NextResponse.json({ success: false, error: "You do not have permission for this action." }, { status: 403 });
  }
  if (error instanceof Error && error.message === "WAREHOUSE_SCOPE_DENIED") {
    return NextResponse.json({ success: false, error: "You are not assigned to one of the warehouses in this file." }, { status: 403 });
  }
  console.error("Inventory Excel operation failed", error);
  return NextResponse.json({ success: false, error: "The Excel operation could not be completed." }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    requirePermission(session, "inventory:adjust");
    const [balances, items, warehouses] = await Promise.all([
      prisma.inventoryBalance.findMany({
        include: { inventoryItem: true, warehouse: true },
        orderBy: [{ inventoryItem: { code: "asc" } }, { warehouse: { code: "asc" } }],
        take: 1000
      }),
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: { code: true, nameEn: true, unit: true },
        orderBy: [{ nameEn: "asc" }, { code: "asc" }]
      }),
      prisma.warehouse.findMany({
        where: { isActive: true },
        select: { code: true, name: true },
        orderBy: { name: "asc" }
      })
    ]);
    const body = await generateInventoryBalanceTemplate(
      balances.map((balance) => ({
        itemCode: balance.inventoryItem.code,
        nameEn: balance.inventoryItem.nameEn || balance.inventoryItem.nameAr,
        warehouseCode: balance.warehouse.code,
        warehouseName: balance.warehouse.name,
        unit: balance.inventoryItem.unit,
        currentQuantity: balance.currentQuantity.toString(),
        reservedQuantity: balance.reservedQuantity.toString()
      })),
      items,
      warehouses,
      request.nextUrl.searchParams.get("locale") ?? "en"
    );
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pino-inventory-count-template-${new Date().toISOString().slice(0, 10)}.xlsx"`
      }
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    requirePermission(session, "inventory:adjust");
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

    const parsed = await parseInventoryBalanceWorkbook(Buffer.from(await file.arrayBuffer()));
    if (parsed.errors.length > 0) {
      return NextResponse.json({ success: false, errors: parsed.errors }, { status: 422 });
    }
    const result = await importInventoryBalanceRows(parsed.rows, session.user.id);
    if (result.errors.length > 0) {
      return NextResponse.json({ success: false, errors: result.errors }, { status: 422 });
    }

    revalidatePath("/[locale]/inventory", "page");
    revalidatePath("/[locale]/inventory/history", "page");
    revalidatePath("/[locale]/inventory/adjustments", "page");
    return NextResponse.json({ success: true, importedRowCount: result.importedRowCount, skippedRowCount: result.skippedRowCount });
  } catch (error) {
    return apiError(error);
  }
}
