import { ReportPage } from "../_components/ReportPage";

export default async function AuditReportsPage({
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
      reportType="AUDIT_USER"
      title="Audit Reports"
      description="User and system audit activity for reportable operational changes."
      searchParams={await searchParams}
    />
  );
}
