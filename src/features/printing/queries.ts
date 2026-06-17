import { Prisma, type PrintJobStatus } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paginationInput, totalPages } from "@/lib/pagination";
import type { PrintHistoryDto, PrintJobDto, PrintPayload, PrinterDto, PrintTemplateDto } from "./types";
import { printHistoryFilterSchema } from "./validation";

export function canViewPrinting(permissions: string[]) {
  return permissions.includes("printing:view") || permissions.includes("printing:create") || permissions.includes("printing:reprint");
}

export function canCreatePrintJobs(permissions: string[]) {
  return permissions.includes("printing:create") || permissions.includes("inventory:manage") || permissions.includes("production:execute");
}

export function canManagePrinters(permissions: string[]) {
  return permissions.includes("printing:manage_printers") || permissions.includes("system:configure");
}

export function canReprintLabels(permissions: string[]) {
  return permissions.includes("printing:reprint") || permissions.includes("system:configure");
}

function requirePrintingView(permissions: string[]) {
  if (!canViewPrinting(permissions) && !canManagePrinters(permissions)) throw new Error("PERMISSION_DENIED");
}

function payloadToDto(payload: Prisma.JsonValue): PrintPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { title: "Print job", qrCodeData: "", qrCodeImage: "" };
  }
  return payload as PrintPayload;
}

function printerName(job: { printer: { name: string } | null }) {
  return job.printer?.name ?? "Browser default";
}

export async function getPrinters(activeOnly = false): Promise<PrinterDto[]> {
  const session = await getServerSession();
  if (!canManagePrinters(session.user.permissions) && !canCreatePrintJobs(session.user.permissions)) throw new Error("PERMISSION_DENIED");
  const printers = await prisma.printer.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: [{ isDefault: "desc" }, { isActive: "desc" }, { name: "asc" }]
  });
  return printers.map((printer) => ({
    id: printer.id,
    name: printer.name,
    description: printer.description,
    type: printer.type,
    isDefault: printer.isDefault,
    isActive: printer.isActive,
    createdAt: printer.createdAt.toISOString(),
    updatedAt: printer.updatedAt.toISOString()
  }));
}

export async function getPrintTemplates(activeOnly = true): Promise<PrintTemplateDto[]> {
  const session = await getServerSession();
  if (!canViewPrinting(session.user.permissions) && !canCreatePrintJobs(session.user.permissions) && !canManagePrinters(session.user.permissions)) {
    throw new Error("PERMISSION_DENIED");
  }
  const templates = await prisma.printTemplate.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { name: "asc" }
  });
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    dimensions: template.dimensions,
    isActive: template.isActive
  }));
}

export async function getPrintJob(id: string): Promise<PrintJobDto | null> {
  const session = await getServerSession();
  requirePrintingView(session.user.permissions);
  const job = await prisma.printJob.findUnique({
    where: { id },
    include: { printer: true, template: true, createdBy: true, reprints: true }
  });
  if (!job) return null;
  return {
    id: job.id,
    printerId: job.printerId,
    printerName: printerName(job),
    templateId: job.templateId,
    templateName: job.template.name,
    templateDimensions: job.template.dimensions,
    status: job.status,
    targetType: job.targetType,
    targetId: job.targetId,
    quantity: job.quantity,
    payload: payloadToDto(job.payload),
    createdByName: job.createdBy.displayName,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    reprintCount: job.reprints.length
  };
}

export async function getPrintQueue(status?: PrintJobStatus): Promise<PrintJobDto[]> {
  const session = await getServerSession();
  requirePrintingView(session.user.permissions);
  const jobs = await prisma.printJob.findMany({
    where: status ? { status } : {},
    include: { printer: true, template: true, createdBy: true, reprints: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return jobs.map((job) => ({
    id: job.id,
    printerId: job.printerId,
    printerName: printerName(job),
    templateId: job.templateId,
    templateName: job.template.name,
    templateDimensions: job.template.dimensions,
    status: job.status,
    targetType: job.targetType,
    targetId: job.targetId,
    quantity: job.quantity,
    payload: payloadToDto(job.payload),
    createdByName: job.createdBy.displayName,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    reprintCount: job.reprints.length
  }));
}

export async function getPrintHistory(filters: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<{ history: PrintHistoryDto[]; page: number; pageSize: number; totalPages: number; totalCount: number }> {
  const session = await getServerSession();
  requirePrintingView(session.user.permissions);
  const parsed = printHistoryFilterSchema.parse(filters);
  const { page, pageSize, skip, take } = paginationInput(parsed.page, parsed.pageSize);
  const search = parsed.search?.trim();
  const where: Prisma.PrintHistoryWhereInput = {
    ...(parsed.status ? { status: parsed.status } : {}),
    ...(parsed.startDate || parsed.endDate
      ? { createdAt: { gte: parsed.startDate ? new Date(parsed.startDate) : undefined, lte: parsed.endDate ? new Date(parsed.endDate) : undefined } }
      : {}),
    ...(search
      ? {
          OR: [
            { actorName: { contains: search, mode: "insensitive" } },
            { printerName: { contains: search, mode: "insensitive" } },
            { printJob: { targetId: { contains: search, mode: "insensitive" } } }
          ]
        }
      : {})
  };
  const [items, totalCount] = await Promise.all([
    prisma.printHistory.findMany({
      where,
      include: { printJob: true },
      orderBy: { createdAt: "desc" },
      skip,
      take
    }),
    prisma.printHistory.count({ where })
  ]);
  return {
    history: items.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      actorName: item.actorName,
      printerName: item.printerName,
      templateName: item.templateName,
      status: item.status,
      errorMessage: item.errorMessage,
      printJob: {
        id: item.printJob.id,
        targetType: item.printJob.targetType,
        targetId: item.printJob.targetId
      }
    })),
    page,
    pageSize,
    totalPages: totalPages(totalCount, pageSize),
    totalCount
  };
}
