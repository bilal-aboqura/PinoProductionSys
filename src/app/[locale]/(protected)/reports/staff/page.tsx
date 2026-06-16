import { ReportPage } from "../_components/ReportPage";

export default async function StaffReportsPage({
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
      reportType="STAFF_SUMMARY"
      title="Staff Performance"
      description="Individual operator completion counts, cancellation counts, timing, and waste activity metrics."
      searchParams={await searchParams}
    />
  );
}
