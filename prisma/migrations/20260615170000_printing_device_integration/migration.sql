-- CreateEnum
CREATE TYPE "PrinterType" AS ENUM ('THERMAL', 'STANDARD', 'PDF_OUTPUT');

-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PrintTarget" AS ENUM ('BATCH', 'CONTAINER', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "ReprintReason" AS ENUM ('DAMAGE', 'LOSS', 'PRINT_ERROR', 'OTHER');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRINTER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRINTER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRINTER_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LABEL_PRINTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LABEL_REPRINTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRINT_JOB_FAILED';

-- CreateTable
CREATE TABLE "printers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PrinterType" NOT NULL DEFAULT 'THERMAL',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dimensions" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" TEXT NOT NULL,
    "printerId" TEXT,
    "templateId" TEXT NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
    "targetType" "PrintTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_history" (
    "id" TEXT NOT NULL,
    "printJobId" TEXT NOT NULL,
    "printerName" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_reprints" (
    "id" TEXT NOT NULL,
    "printJobId" TEXT NOT NULL,
    "reason" "ReprintReason" NOT NULL,
    "customReason" TEXT,
    "requestedById" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_reprints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "printers_name_key" ON "printers"("name");
CREATE INDEX "printers_isActive_isDefault_idx" ON "printers"("isActive", "isDefault");
CREATE UNIQUE INDEX "print_templates_name_key" ON "print_templates"("name");
CREATE INDEX "print_jobs_status_createdAt_idx" ON "print_jobs"("status", "createdAt");
CREATE INDEX "print_jobs_targetType_targetId_idx" ON "print_jobs"("targetType", "targetId");
CREATE INDEX "print_jobs_createdById_idx" ON "print_jobs"("createdById");
CREATE INDEX "print_history_createdAt_idx" ON "print_history"("createdAt");
CREATE INDEX "print_history_actorId_idx" ON "print_history"("actorId");
CREATE INDEX "print_history_status_idx" ON "print_history"("status");
CREATE INDEX "print_reprints_printJobId_createdAt_idx" ON "print_reprints"("printJobId", "createdAt");

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "printers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "print_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "print_history" ADD CONSTRAINT "print_history_printJobId_fkey" FOREIGN KEY ("printJobId") REFERENCES "print_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_history" ADD CONSTRAINT "print_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "print_reprints" ADD CONSTRAINT "print_reprints_printJobId_fkey" FOREIGN KEY ("printJobId") REFERENCES "print_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_reprints" ADD CONSTRAINT "print_reprints_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
