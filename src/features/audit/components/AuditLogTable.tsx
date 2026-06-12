import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditLogEntry } from "@/features/audit/types";

export async function AuditLogTable({ logs, locale }: { logs: AuditLogEntry[]; locale: string }) {
  const t = await getTranslations("audit");

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("actor")}</TableHead>
            <TableHead>{t("target")}</TableHead>
            <TableHead>{t("action")}</TableHead>
            <TableHead>{t("dateTime")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>{t("empty")}</TableCell>
            </TableRow>
          ) : null}
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.actorName}</TableCell>
              <TableCell>{log.targetName ?? "-"}</TableCell>
              <TableCell>
                <Badge>{t(`actions.${log.action}`)}</Badge>
              </TableCell>
              <TableCell>{new Date(log.createdAt).toLocaleString(locale)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
