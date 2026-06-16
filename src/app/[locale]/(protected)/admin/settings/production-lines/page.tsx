import { AccessDenied } from "@/components/shared/AccessDenied";
import { getMasterEntities, canConfigureSettings, canViewSettings } from "@/features/settings/queries";
import { getServerSession } from "@/lib/auth";
import { MasterDataSection } from "../components/MasterDataSection";

export default async function ProductionLinesSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!canViewSettings(session.user.permissions)) return <AccessDenied locale={locale} />;
  const items = await getMasterEntities("production_lines");
  return (
    <MasterDataSection
      title="Production Lines"
      description="Manage localized production lines used for production assignment and reporting."
      entityType="production_lines"
      items={items}
      canManage={canConfigureSettings(session.user.permissions)}
    />
  );
}
