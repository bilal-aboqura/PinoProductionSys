import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listRecipeAuditLogs } from "@/features/recipes/actions";

export default async function RecipeAuditPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  try {
    const logs = await listRecipeAuditLogs(id);
    return (
      <section className="logical-container py-8">
        <Link className="text-sm font-semibold text-primary" href={`/${locale}/recipes/${id}`}>
          Back to recipe
        </Link>
        <h1 className="mb-6 mt-3 text-3xl font-bold">Recipe Audit Log</h1>
        <div className="overflow-x-auto rounded-md border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.actorId}</TableCell>
                  <TableCell>{log.timestamp.toLocaleString()}</TableCell>
                  <TableCell className="max-w-xl truncate">{JSON.stringify({ before: log.prevValue, after: log.newValue })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    );
  } catch {
    return <AccessDenied locale={locale} />;
  }
}

