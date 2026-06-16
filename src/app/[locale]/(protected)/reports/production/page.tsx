import { ReportPage } from "../_components/ReportPage";

export default async function ProductionReportsPage({
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
      reportType="PRODUCTION_SUMMARY"
      title="Production Reports"
      description="Production order status, output quantities, completion timing, and drill-down links into production orders."
      searchParams={await searchParams}
    />
  );
}
