import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { generateExcelReport } from "@/features/reports/exports/excel";
import { generatePdfReport } from "@/features/reports/exports/pdf";
import { getReportRows } from "@/features/reports/queries";
import type { ReportFilters } from "@/features/reports/types";
import { exportRequestSchema } from "@/features/reports/validation";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    requirePermission(session, "reports:view");

    const searchParams = request.nextUrl.searchParams;
    const filtersParam = searchParams.get("filters");
    const parsed = exportRequestSchema.parse({
      format: searchParams.get("format"),
      reportType: searchParams.get("reportType"),
      filters: filtersParam ? JSON.parse(filtersParam) : {}
    });

    const filters = (parsed.filters ?? {}) as ReportFilters;
    const report = await getReportRows(parsed.reportType, filters, 1, 100);
    const filename = `${parsed.reportType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;
    const common = {
      reportType: parsed.reportType,
      filters,
      rows: report.rows,
      columns: report.columns,
      exportedBy: session.user.email ?? session.user.name ?? session.user.id
    };

    if (parsed.format === "excel") {
      const body = await generateExcelReport(common);
      return new NextResponse(new Uint8Array(body), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`
        }
      });
    }

    const body = await generatePdfReport(common);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`
      }
    });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid filters JSON" }, { status: 400 });
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof Error && error.message === "PERMISSION_DENIED") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Invalid report export request" }, { status: 400 });
  }
}
