"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getDashboardMetrics, getReportRows, listReportArchives, listScheduledReports } from "./queries";
import type { DashboardMetrics, ReportDataResult, ReportFilters, ReportType, ScheduledReportDto, ScheduledReportInput } from "./types";
import { reportFiltersSchema, reportTypeSchema, scheduledReportSchema } from "./validation";

async function requireReportsSession() {
  const session = await getServerSession();
  requirePermission(session, "reports:view");
  return session;
}

export async function getDashboardKPIs(filters: ReportFilters = {}): Promise<DashboardMetrics> {
  await requireReportsSession();
  const parsed = reportFiltersSchema.parse(filters);
  return getDashboardMetrics(parsed);
}

export async function getReportData(reportType: ReportType, filters: ReportFilters = {}, page = 1, limit = 50): Promise<ReportDataResult> {
  await requireReportsSession();
  const parsedType = reportTypeSchema.parse(reportType);
  const parsedFilters = reportFiltersSchema.parse(filters);
  return getReportRows(parsedType, parsedFilters, page, limit);
}

export async function createScheduledReport(data: ScheduledReportInput): Promise<{ success: boolean; id: string }> {
  const session = await requireReportsSession();
  const parsed = scheduledReportSchema.parse(data);
  const report = await prisma.scheduledReport.create({
    data: {
      name: parsed.name,
      reportType: parsed.reportType,
      frequency: parsed.frequency,
      format: parsed.format,
      filters: parsed.filters as Prisma.InputJsonValue,
      recipients: parsed.recipients,
      createdById: session.user.id
    }
  });
  return { success: true, id: report.id };
}

export async function toggleScheduledReport(id: string, isActive: boolean): Promise<{ success: boolean }> {
  await requireReportsSession();
  await prisma.scheduledReport.update({ where: { id }, data: { isActive } });
  return { success: true };
}

export async function getScheduledReports(): Promise<ScheduledReportDto[]> {
  await requireReportsSession();
  return listScheduledReports();
}

export async function getReportArchives() {
  await requireReportsSession();
  return listReportArchives();
}
