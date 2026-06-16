import { AccessDenied } from "@/components/shared/AccessDenied";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { updateAlertRuleFromForm } from "@/features/notifications/actions";
import { getAlertRules } from "@/features/notifications/queries";

export default async function AlertRulesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  try {
    const session = await getServerSession();
    if (!session.user.permissions.includes("notifications:manage_rules")) {
      requirePermission(session, "system:configure");
    }
    const rules = await getAlertRules();

    return (
      <section className="logical-container py-8">
        <div>
          <h1 className="text-3xl font-bold">Alert Rules</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">Configure operational thresholds, severities, and enabled states for automatic notifications.</p>
        </div>

        <div className="mt-6 grid gap-4">
          {rules.map((rule) => (
            <form key={rule.id} action={updateAlertRuleFromForm} className="rounded-md border bg-white p-4">
              <input type="hidden" name="ruleId" value={rule.id} />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">{rule.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {rule.category} · {rule.triggerType} · Roles: {rule.targetRoles.join(", ")}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <input name="isEnabled" type="checkbox" defaultChecked={rule.isEnabled} />
                  Enabled
                </label>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px_auto]">
                <label className="grid gap-1 text-sm font-semibold text-secondary">
                  Parameters JSON
                  <textarea
                    name="parameters"
                    defaultValue={JSON.stringify(rule.parameters, null, 2)}
                    className="min-h-24 rounded-md border px-3 py-2 font-mono text-sm"
                  />
                </label>
                <label className="grid content-start gap-1 text-sm font-semibold text-secondary">
                  Severity
                  <select name="severity" defaultValue={rule.severity} className="h-10 rounded-md border px-3 text-sm">
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <button className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-white" type="submit">
                    Save
                  </button>
                </div>
              </div>
            </form>
          ))}
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
