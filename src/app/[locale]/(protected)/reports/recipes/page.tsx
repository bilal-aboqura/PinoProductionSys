import { ReportPage } from "../_components/ReportPage";
import type { ReportType } from "@/features/reports/types";

export default async function RecipeCostingReportsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const query = await searchParams;
  const allowed: ReportType[] = ["RECIPE_COST_SUMMARY", "RECIPE_CALORIE_SUMMARY", "RECIPE_PROFITABILITY", "RECIPE_COST_TREND"];
  const requested = Array.isArray(query.view) ? query.view[0] : query.view;
  const reportType = allowed.includes(requested as ReportType) ? requested as ReportType : "RECIPE_COST_SUMMARY";
  return <>
    <nav className="logical-container flex flex-wrap gap-2 pt-8">
      {allowed.map((type) => <a className={`rounded-md border px-3 py-2 text-sm font-semibold ${type === reportType ? "bg-primary text-white" : "bg-white text-secondary"}`} href={`?view=${type}`} key={type}>{type.replaceAll("_", " ")}</a>)}
    </nav>
    <ReportPage locale={locale} reportType={reportType} title="Recipe Costing & Nutrition" description="Frozen recipe-version cost, calorie, trend, and profitability analysis." searchParams={query} />
  </>;
}
