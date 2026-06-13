import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFastNavUser } from "@/lib/fast-nav";

export default async function DashboardPage() {
  const user = await getFastNavUser();
  const nav = await getTranslations("navigation");
  const permissions = new Set(user?.permissions ?? []);

  return (
    <section className="logical-container py-8">
      <h1 className="text-3xl font-bold">{nav("dashboard")}</h1>
      <p className="mt-2 text-secondary">{user?.roleDisplayName ?? user?.displayName}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {permissions.has("production:view") ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{nav("production")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">Accessible</CardContent>
          </Card>
        ) : null}
        {permissions.has("inventory:view") ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{nav("inventory")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">Accessible</CardContent>
          </Card>
        ) : null}
        {permissions.has("reports:view") ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{nav("reports")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">Accessible</CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
