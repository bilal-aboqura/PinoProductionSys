import { AccessDenied } from "@/components/shared/AccessDenied";
import { getMasterEntities, canConfigureSettings, canViewSettings } from "@/features/settings/queries";
import { getServerSession } from "@/lib/auth";
import { MasterDataSection } from "../components/MasterDataSection";

export default async function WarehouseSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!canViewSettings(session.user.permissions)) return <AccessDenied locale={locale} />;
  const items = await getMasterEntities("warehouses");
  return (
    <MasterDataSection
      title="Warehouses"
      description="Manage warehouse codes, localized names, and active availability for inventory workflows."
      entityType="warehouses"
      items={items}
      canManage={canConfigureSettings(session.user.permissions)}
    />
  );
}
