import { getServerSession } from "@/lib/auth";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { canConfigureSettings, canViewSettings, getSystemSettings } from "@/features/settings/queries";
import { SettingsPreferencesForm } from "./components/SettingsPreferencesForm";

export default async function AdminSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!canViewSettings(session.user.permissions)) return <AccessDenied locale={locale} />;
  const settings = await getSystemSettings();
  return <SettingsPreferencesForm locale={locale} settings={settings} canManage={canConfigureSettings(session.user.permissions)} />;
}
