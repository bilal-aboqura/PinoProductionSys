import { ReportPage } from "../_components/ReportPage";

export default async function InventoryReportsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  return (
    <ReportPage
      locale={locale}
      reportType="INVENTORY_LEVELS"
      title="Inventory Reports"
      description="Current stock levels, available quantities, low-stock state, and movement drill-downs."
      searchParams={await searchParams}
    />
  );
}
