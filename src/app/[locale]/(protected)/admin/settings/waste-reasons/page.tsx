import { AccessDenied } from "@/components/shared/AccessDenied";
import { getMasterEntities, canConfigureSettings, canViewSettings } from "@/features/settings/queries";
import { getServerSession } from "@/lib/auth";
import { MasterDataSection } from "../components/MasterDataSection";

export default async function WasteReasonsSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!canViewSettings(session.user.permissions)) return <AccessDenied locale={locale} />;
  const items = await getMasterEntities("waste_reasons");
  return (
    <MasterDataSection
      title="Waste Reasons"
      description="Configure active waste and disposal reason options used in inventory waste recording."
      entityType="waste_reasons"
      items={items}
      canManage={canConfigureSettings(session.user.permissions)}
    />
  );
}
