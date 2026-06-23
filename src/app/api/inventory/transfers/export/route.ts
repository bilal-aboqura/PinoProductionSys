import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canExportTransfers(permissions: string[]) {
  return permissions.includes("inventory:view") || permissions.includes("inventory:transfer") || permissions.includes("reports:view");
}

function safeFilenamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!canExportTransfers(session.user.permissions)) {
      return NextResponse.json({ success: false, error: "You do not have permission to export warehouse transfers." }, { status: 403 });
    }

    const batchNumber = request.nextUrl.searchParams.get("batchNumber")?.trim();
    const transfers = await prisma.inventoryTransfer.findMany({
      include: { item: true, sourceWh: true, destWh: true, user: true },
      orderBy: { timestamp: "desc" },
      take: 5000
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Pino Production System";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Warehouse Transfers", {
      views: [{ state: "frozen", ySplit: 5 }]
    });

    sheet.mergeCells("A1:I1");
    sheet.getCell("A1").value = "Pino Production - Warehouse Transfers";
    sheet.getCell("A1").font = { bold: true, color: { argb: "FFFFFFFF" }, size: 16 };
    sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA14323" } };
    sheet.getCell("A2").value = `Exported by: ${session.user.email ?? session.user.name ?? session.user.id}`;
    sheet.getCell("A3").value = `Exported at: ${new Date().toISOString()}`;
    sheet.getCell("A4").value = batchNumber ? `Scanned batch: ${batchNumber}` : "Scanned batch: All";

    const columns = [
      "Timestamp",
      "Transfer ID",
      "Item Code",
      "Item Name",
      "Source Warehouse",
      "Destination Warehouse",
      "Quantity",
      "Unit",
      "User",
      "Notes"
    ];
    const header = sheet.getRow(6);
    columns.forEach((label, index) => {
      const cell = header.getCell(index + 1);
      cell.value = label;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF665936" } };
    });

    transfers.forEach((transfer) => {
      sheet.addRow([
        transfer.timestamp.toISOString(),
        transfer.id,
        transfer.item.code,
        transfer.item.nameEn || transfer.item.nameAr,
        `${transfer.sourceWh.code} - ${transfer.sourceWh.name}`,
        `${transfer.destWh.code} - ${transfer.destWh.name}`,
        Number(transfer.quantity.toString()),
        transfer.item.unit,
        transfer.user.displayName,
        transfer.notes ?? ""
      ]);
    });

    sheet.getColumn(7).numFmt = "#,##0.000";
    sheet.columns.forEach((column) => {
      let width = 14;
      column.eachCell?.((cell) => {
        width = Math.max(width, String(cell.value ?? "").length + 2);
      });
      column.width = Math.min(width, 48);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = batchNumber
      ? `warehouse-transfers-${safeFilenamePart(batchNumber)}.xlsx`
      : `warehouse-transfers-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "You must sign in to continue." }, { status: 401 });
    }
    console.error("Warehouse transfer export failed", error);
    return NextResponse.json({ success: false, error: "Warehouse transfer export failed." }, { status: 500 });
  }
}
