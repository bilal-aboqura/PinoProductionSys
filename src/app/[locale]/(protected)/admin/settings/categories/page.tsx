import { AccessDenied } from "@/components/shared/AccessDenied";
import { getMasterEntities, canConfigureSettings, canViewSettings } from "@/features/settings/queries";
import { getServerSession } from "@/lib/auth";
import { MasterDataSection } from "../components/MasterDataSection";

export default async function RecipeCategorySettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!canViewSettings(session.user.permissions)) return <AccessDenied locale={locale} />;
  const items = await getMasterEntities("recipe_categories");
  return (
    <MasterDataSection
      title="Recipe Categories"
      description="Manage localized recipe categories and archive obsolete categories without breaking historical recipes."
      entityType="recipe_categories"
      items={items}
      canManage={canConfigureSettings(session.user.permissions)}
    />
  );
}
