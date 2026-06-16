import { AccessDenied } from "@/components/shared/AccessDenied";
import { getMasterEntities, canConfigureSettings, canViewSettings } from "@/features/settings/queries";
import { getServerSession } from "@/lib/auth";
import { MasterDataSection } from "../components/MasterDataSection";

export default async function DepartmentsSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!canViewSettings(session.user.permissions)) return <AccessDenied locale={locale} />;
  const items = await getMasterEntities("departments");
  return (
    <MasterDataSection
      title="Departments"
      description="Manage localized operational departments used for user scope and production ownership."
      entityType="departments"
      items={items}
      canManage={canConfigureSettings(session.user.permissions)}
    />
  );
}
