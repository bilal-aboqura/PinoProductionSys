import { ReportPage } from "../_components/ReportPage";

export default async function WarehouseReportsPage({
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
      reportType="WAREHOUSE_STOCK"
      title="Warehouse Reports"
      description="Warehouse stock position with item availability and quick navigation into movement history."
      searchParams={await searchParams}
    />
  );
}
