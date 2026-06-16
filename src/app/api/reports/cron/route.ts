import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { REPORTS_ARCHIVE_BUCKET, ensureReportsArchiveBucket, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { generateExcelReport } from "@/features/reports/exports/excel";
import { generatePdfReport } from "@/features/reports/exports/pdf";
import { getReportRows } from "@/features/reports/queries";
import type { ReportFilters, ReportFormat, ReportType } from "@/features/reports/types";

export async function POST() {
  try {
    const session = await getServerSession();
    requirePermission(session, "reports:view");

    const supabase = getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase storage is not configured" }, { status: 500 });

    const bucket = await ensureReportsArchiveBucket(supabase);
    if (!bucket.success) return NextResponse.json({ error: bucket.error }, { status: 500 });

    const scheduledReports = await prisma.scheduledReport.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    const archives = [];

    for (const scheduled of scheduledReports) {
      const formats = formatsFor(scheduled.format as ReportFormat);
      const report = await getReportRows(scheduled.reportType as ReportType, scheduled.filters as ReportFilters, 1, 100);
      for (const format of formats) {
        const extension = format === "EXCEL" ? "xlsx" : "pdf";
        const contentType =
          format === "EXCEL" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
        const name = `${scheduled.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.${extension}`;
        const buffer =
          format === "EXCEL"
            ? await generateExcelReport({
                reportType: scheduled.reportType as ReportType,
                filters: scheduled.filters as ReportFilters,
                rows: report.rows,
                columns: report.columns,
                exportedBy: "Scheduled job"
              })
            : await generatePdfReport({
                reportType: scheduled.reportType as ReportType,
                filters: scheduled.filters as ReportFilters,
                rows: report.rows,
                columns: report.columns,
                exportedBy: "Scheduled job"
              });
        const storagePath = `${scheduled.id}/${Date.now()}-${name}`;
        const uploaded = await supabase.storage.from(REPORTS_ARCHIVE_BUCKET).upload(storagePath, buffer, { contentType, upsert: false });
        if (uploaded.error) throw new Error(uploaded.error.message);
        const archive = await prisma.reportArchive.create({
          data: {
            scheduledReportId: scheduled.id,
            name,
            format,
            fileUrl: `${REPORTS_ARCHIVE_BUCKET}/${storagePath}`,
            sizeBytes: buffer.byteLength
          }
        });
        archives.push({ id: archive.id, name: archive.name, fileUrl: archive.fileUrl });
      }
    }

    return NextResponse.json({ success: true, generated: archives.length, archives });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof Error && error.message === "PERMISSION_DENIED") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scheduled report generation failed" }, { status: 500 });
  }
}

function formatsFor(format: ReportFormat) {
  if (format === "BOTH") return ["EXCEL", "PDF"] as const;
  return [format] as const;
}
