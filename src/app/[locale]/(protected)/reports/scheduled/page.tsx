import { revalidatePath } from "next/cache";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { createScheduledReport, getReportArchives, getScheduledReports } from "@/features/reports/actions";
import type { ReportFormat, ReportFrequency, ReportType } from "@/features/reports/types";

const reportTypes: ReportType[] = ["PRODUCTION_SUMMARY", "INVENTORY_LEVELS", "ACTIVE_BATCHES", "WASTE_SUMMARY", "WAREHOUSE_STOCK", "STAFF_SUMMARY", "AUDIT_USER"];

export default async function ScheduledReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  try {
    const session = await getServerSession();
    requirePermission(session, "reports:view");
    const [scheduled, archives] = await Promise.all([getScheduledReports(), getReportArchives()]);

    async function createSchedule(formData: FormData) {
      "use server";
      await createScheduledReport({
        name: String(formData.get("name") ?? ""),
        reportType: String(formData.get("reportType") ?? "PRODUCTION_SUMMARY") as ReportType,
        frequency: String(formData.get("frequency") ?? "DAILY") as ReportFrequency,
        format: String(formData.get("format") ?? "EXCEL") as ReportFormat,
        filters: {},
        recipients: []
      });
      revalidatePath(`/${locale}/reports/scheduled`);
    }

    return (
      <section className="logical-container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Scheduled Reports</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">Configure recurring report snapshots and review generated archive artifacts.</p>
        </div>

        <form action={createSchedule} className="grid gap-3 rounded-md border bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_160px_140px_auto]">
          <input className="h-10 rounded-md border px-3 text-sm" name="name" placeholder="Schedule name" required />
          <select className="h-10 rounded-md border bg-white px-3 text-sm" name="reportType" defaultValue="PRODUCTION_SUMMARY">
            {reportTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-md border bg-white px-3 text-sm" name="frequency" defaultValue="DAILY">
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
          <select className="h-10 rounded-md border bg-white px-3 text-sm" name="format" defaultValue="EXCEL">
            <option value="EXCEL">Excel</option>
            <option value="PDF">PDF</option>
            <option value="BOTH">Both</option>
          </select>
          <Button type="submit">Create</Button>
        </form>

        <div className="mt-6 rounded-md border bg-white shadow-sm">
          <h2 className="border-b p-4 text-base font-semibold">Schedules</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduled.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.reportType}</TableCell>
                  <TableCell>{item.frequency}</TableCell>
                  <TableCell>{item.format}</TableCell>
                  <TableCell>
                    <Badge>{item.isActive ? "Active" : "Paused"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 rounded-md border bg-white shadow-sm">
          <h2 className="border-b p-4 text-base font-semibold">Archive</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Generated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archives.map((archive) => (
                <TableRow key={archive.id}>
                  <TableCell>{archive.name}</TableCell>
                  <TableCell>{archive.format}</TableCell>
                  <TableCell>{archive.sizeBytes}</TableCell>
                  <TableCell>{new Date(archive.generatedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    );
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "PERMISSION_DENIED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
}
