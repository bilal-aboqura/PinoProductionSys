import { getTranslations } from "next-intl/server";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession();
  const nav = await getTranslations("navigation");

  return (
    <section className="logical-container py-8">
      <h1 className="text-3xl font-bold">{nav("dashboard")}</h1>
      <p className="mt-2 text-secondary">{session.user.roleDisplayName ?? session.user.displayName}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <PermissionGate permission="production:view">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{nav("production")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">Accessible</CardContent>
          </Card>
        </PermissionGate>
        <PermissionGate permission="inventory:view">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{nav("inventory")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">Accessible</CardContent>
          </Card>
        </PermissionGate>
        <PermissionGate permission="reports:view">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{nav("reports")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">Accessible</CardContent>
          </Card>
        </PermissionGate>
      </div>
    </section>
  );
}
