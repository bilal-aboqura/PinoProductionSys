import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserSummary } from "@/features/users/types";

export async function UserTable({ users, locale }: { users: UserSummary[]; locale: string }) {
  const t = await getTranslations("users");
  const common = await getTranslations("common");

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("displayName")}</TableHead>
            <TableHead>{t("username")}</TableHead>
            <TableHead>{t("email")}</TableHead>
            <TableHead>{t("role")}</TableHead>
            <TableHead>{common("status")}</TableHead>
            <TableHead>{t("lastLogin")}</TableHead>
            <TableHead>{common("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-semibold">{user.displayName}</TableCell>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.email ?? "-"}</TableCell>
              <TableCell>{user.role ? <Badge>{user.role.displayName}</Badge> : "-"}</TableCell>
              <TableCell>
                <Badge className={user.isActive ? "bg-success/15 text-success" : "bg-error/15 text-error"}>
                  {user.isActive ? common("active") : common("inactive")}
                </Badge>
              </TableCell>
              <TableCell>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString(locale) : "-"}</TableCell>
              <TableCell>
                <Link className="font-semibold text-primary hover:underline" href={`/${locale}/admin/users/${user.id}`}>
                  {common("edit")}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
