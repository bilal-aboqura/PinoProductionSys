import type { PrintJobStatus, PrintTarget, PrinterType, ReprintReason } from "@prisma/client";

export type LabelDimensions = "50x50mm" | "100x50mm" | "100x100mm";

export type PrinterDto = {
  id: string;
  name: string;
  description: string | null;
  type: PrinterType;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PrintTemplateDto = {
  id: string;
  name: string;
  dimensions: string;
  isActive: boolean;
};

export type PrintPayload = {
  title: string;
  subtitle?: string;
  productName?: string;
  batchNumber?: string;
  containerNumber?: string;
  warehouseName?: string;
  warehouseCode?: string;
  productionDate?: string;
  expiryDate?: string;
  quantity?: string;
  unit?: string;
  storageInstructions?: string | null;
  qrCodeData: string;
  qrCodeImage: string;
};

export type PrintJobDto = {
  id: string;
  printerId: string | null;
  printerName: string;
  templateId: string;
  templateName: string;
  templateDimensions: string;
  status: PrintJobStatus;
  targetType: PrintTarget;
  targetId: string;
  quantity: number;
  payload: PrintPayload;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  reprintCount: number;
};

export type PrintHistoryDto = {
  id: string;
  createdAt: string;
  actorName: string;
  printerName: string;
  templateName: string;
  status: string;
  errorMessage: string | null;
  printJob: {
    id: string;
    targetType: PrintTarget;
    targetId: string;
  };
};

export type CreatePrintJobInput = {
  targetType: PrintTarget;
  targetId: string;
  templateId: string;
  printerId?: string | null;
  quantity: number;
};

export type PrinterConfigInput = {
  name: string;
  description?: string | null;
  type: PrinterType;
  isDefault: boolean;
  isActive: boolean;
};

export type ReprintInput = {
  printJobId: string;
  reason: ReprintReason;
  customReason?: string | null;
};

export type ActionResult = { success: true; jobId?: string; printerId?: string } | { success: false; error: string };
