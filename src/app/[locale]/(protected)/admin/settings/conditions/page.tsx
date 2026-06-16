import { AccessDenied } from "@/components/shared/AccessDenied";
import { getMasterEntities, canConfigureSettings, canViewSettings } from "@/features/settings/queries";
import { getServerSession } from "@/lib/auth";
import { MasterDataSection } from "../components/MasterDataSection";

export default async function StorageConditionsSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!canViewSettings(session.user.permissions)) return <AccessDenied locale={locale} />;
  const items = await getMasterEntities("storage_conditions");
  return (
    <MasterDataSection
      title="Storage Conditions"
      description="Configure localized storage condition labels and safe temperature ranges."
      entityType="storage_conditions"
      items={items}
      canManage={canConfigureSettings(session.user.permissions)}
    />
  );
}
