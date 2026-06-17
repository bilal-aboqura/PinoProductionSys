import { Badge } from "@/components/ui/badge";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Pagination } from "@/components/shared/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canViewSettings, getSettingsAuditLogs } from "@/features/settings/queries";
import { getServerSession } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";

function JsonBlock({ value }: { value: unknown }) {
  if (!value || value === null) return <span className="text-secondary">-</span>;
  return <pre className="max-w-md overflow-x-auto rounded-md bg-background p-2 text-xs">{JSON.stringify(value, null, 2)}</pre>;
}

export default async function SettingsAuditPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!canViewSettings(session.user.permissions)) return <AccessDenied locale={locale} />;
  const filters = await searchParams;
  const page = parsePage(filters.page);
  const result = await getSettingsAuditLogs({ page, action: filters.action as never });

  return (
    <section className="logical-container space-y-6 py-8">
      <div>
        <p className="text-sm font-semibold text-secondary">Settings</p>
        <h1 className="text-3xl font-bold">Configuration Audit</h1>
      </div>
      <div className="overflow-x-auto rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Before</TableHead>
              <TableHead>After</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                <TableCell>{log.actorName}</TableCell>
                <TableCell><Badge>{log.action}</Badge></TableCell>
                <TableCell>{log.targetName ?? "-"}</TableCell>
                <TableCell><JsonBlock value={log.previousValue} /></TableCell>
                <TableCell><JsonBlock value={log.newValue} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        pathname={`/${locale}/admin/settings/audit`}
        page={page}
        totalPages={result.totalPages}
        totalItems={result.totalCount}
        searchParams={filters}
        itemLabel="entries"
      />
    </section>
  );
}
