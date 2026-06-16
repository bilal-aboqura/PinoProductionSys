import { ReportPage } from "../_components/ReportPage";

export default async function WasteReportsPage({
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
      reportType="WASTE_SUMMARY"
      title="Waste Reports"
      description="Waste records grouped for operational review, including reason, item, warehouse, quantity, and time."
      searchParams={await searchParams}
    />
  );
}
