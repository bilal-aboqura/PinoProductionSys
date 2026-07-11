import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { ScaledIngredientsCard } from "@/components/recipes/ScaledIngredientsCard";
import { getBatchTraceabilityAction } from "@/features/batches/queries";
import type { BatchTraceability } from "@/features/batches/types";
import { PrintBatchButton } from "@/features/printing/components/PrintBatchButton";
import { getPrinters, getPrintTemplates } from "@/features/printing/queries";
import { getWarehouses } from "@/features/inventory/queries";
import { getServerSession } from "@/lib/auth";
import { BatchTransferForm } from "../_components/BatchTransferForm";
import { DisposalModal } from "../_components/DisposalModal";
import { EvidenceUploader } from "../_components/EvidenceUploader";
import { LabelModal } from "../_components/LabelModal";
import { SplitModal } from "../_components/SplitModal";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number | null) {
  if (!seconds) return "Not recorded";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function canDownloadTransfers(permissions: string[]) {
  return permissions.includes("inventory:view") || permissions.includes("inventory:transfer") || permissions.includes("reports:view");
}

function canTransferInventory(permissions: string[]) {
  return permissions.includes("inventory:transfer");
}

function timelineTitle(
  locale: string,
  item: {
    eventType: "STATUS" | "TRANSFER";
    fromStatus?: string | null;
    toStatus?: string;
    sourceWarehouseName?: string;
    destinationWarehouseName?: string;
  }
) {
  if (item.eventType === "TRANSFER") {
    const source = item.sourceWarehouseName ?? (locale === "ar" ? "مخزن غير معروف" : "Unknown warehouse");
    const destination = item.destinationWarehouseName ?? (locale === "ar" ? "مخزن غير معروف" : "Unknown warehouse");
    return locale === "ar" ? `تحويل من ${source} إلى ${destination}` : `Transfer from ${source} to ${destination}`;
  }

  const fromStatus = item.fromStatus ?? "NEW";
  const toStatus = item.toStatus ?? "ACTIVE";
  return locale === "ar" ? `${fromStatus} إلى ${toStatus}` : `${fromStatus} to ${toStatus}`;
}

function timelineDetails(
  item: {
    eventType: "STATUS" | "TRANSFER";
    actorName: string;
    reason?: string | null;
    quantity?: string;
    unit?: string;
    notes?: string | null;
  }
) {
  if (item.eventType === "TRANSFER") {
    const extras = [`${item.quantity ?? "0"} ${item.unit ?? ""}`.trim()];
    if (item.notes) extras.push(item.notes);
    return `${item.actorName} - ${extras.join(" - ")}`;
  }

  return item.reason ? `${item.actorName} - ${item.reason}` : item.actorName;
}

void timelineTitle;
void timelineDetails;

type TimelineItem = BatchTraceability["timeline"][number];

function isArabicLocale(locale: string) {
  return locale.startsWith("ar");
}

function text(locale: string, en: string, ar: string) {
  return isArabicLocale(locale) ? ar : en;
}

function statusLabel(locale: string, status?: string | null) {
  switch (status) {
    case "ACTIVE":
      return text(locale, "ACTIVE", "\u0646\u0634\u0637");
    case "CONSUMED":
      return text(locale, "CONSUMED", "\u0645\u0633\u062a\u0647\u0644\u0643");
    case "EXPIRED":
      return text(locale, "EXPIRED", "\u0645\u0646\u062a\u0647\u064a");
    case "DISPOSED":
      return text(locale, "DISPOSED", "\u062a\u0627\u0644\u0641");
    case "NEW":
    default:
      return text(locale, "NEW", "\u062c\u062f\u064a\u062f");
  }
}

function timelineBadgeLabelV2(locale: string, eventType: TimelineItem["eventType"]) {
  switch (eventType) {
    case "CREATED":
      return text(locale, "Created", "\u0625\u0646\u0634\u0627\u0621");
    case "TRANSFER":
      return text(locale, "Transfer", "\u062a\u062d\u0648\u064a\u0644");
    case "PRINT":
    case "REPRINT":
      return text(locale, "Print", "\u0637\u0628\u0627\u0639\u0629");
    case "SPLIT":
      return text(locale, "Split", "\u062a\u0642\u0633\u064a\u0645");
    case "DISPOSAL":
      return text(locale, "Disposal", "\u0625\u062a\u0644\u0627\u0641");
    case "EVIDENCE":
      return text(locale, "Evidence", "\u0645\u0631\u0641\u0642");
    case "INVENTORY_SYNC":
      return text(locale, "Inventory", "\u0627\u0644\u0645\u062e\u0632\u0648\u0646");
    case "STATUS":
    default:
      return text(locale, "Status", "\u062d\u0627\u0644\u0629");
  }
}

function timelineBadgeClassNameV2(eventType: TimelineItem["eventType"]) {
  switch (eventType) {
    case "TRANSFER":
      return "bg-primary/10 text-primary";
    case "DISPOSAL":
      return "bg-warning/10 text-warning";
    case "EVIDENCE":
      return "bg-accent text-secondary";
    default:
      return undefined;
  }
}

function timelineTitleV2(locale: string, item: TimelineItem) {
  const unknownWarehouse = text(locale, "Unknown warehouse", "\u0645\u062e\u0632\u0646 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641");

  switch (item.eventType) {
    case "CREATED":
      return text(locale, "Batch created", "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062f\u0641\u0639\u0629");
    case "TRANSFER": {
      const source = item.sourceWarehouseName ?? unknownWarehouse;
      const destination = item.destinationWarehouseName ?? unknownWarehouse;
      if (item.containerNumber) {
        return text(
          locale,
          `Transfer container ${item.containerNumber} from ${source} to ${destination}`,
          `\u062a\u062d\u0648\u064a\u0644 \u0627\u0644\u062d\u0627\u0648\u064a\u0629 ${item.containerNumber} \u0645\u0646 ${source} \u0625\u0644\u0649 ${destination}`
        );
      }
      return text(
        locale,
        `Transfer from ${source} to ${destination}`,
        `\u062a\u062d\u0648\u064a\u0644 \u0645\u0646 ${source} \u0625\u0644\u0649 ${destination}`
      );
    }
    case "PRINT":
      return item.containerNumber
        ? text(
            locale,
            `Printed label for ${item.containerNumber}`,
            `\u062a\u0645\u062a \u0637\u0628\u0627\u0639\u0629 \u0645\u0644\u0635\u0642 ${item.containerNumber}`
          )
        : text(locale, "Printed batch label", "\u062a\u0645\u062a \u0637\u0628\u0627\u0639\u0629 \u0645\u0644\u0635\u0642 \u0627\u0644\u062f\u0641\u0639\u0629");
    case "REPRINT":
      return item.containerNumber
        ? text(
            locale,
            `Reprinted label for ${item.containerNumber}`,
            `\u0625\u0639\u0627\u062f\u0629 \u0637\u0628\u0627\u0639\u0629 \u0645\u0644\u0635\u0642 ${item.containerNumber}`
          )
        : text(
            locale,
            "Reprinted batch label",
            "\u0625\u0639\u0627\u062f\u0629 \u0637\u0628\u0627\u0639\u0629 \u0645\u0644\u0635\u0642 \u0627\u0644\u062f\u0641\u0639\u0629"
          );
    case "SPLIT":
      return text(
        locale,
        `Split into ${item.containerCount ?? 0} containers`,
        `\u062a\u0645 \u062a\u0642\u0633\u064a\u0645\u0647\u0627 \u0625\u0644\u0649 ${item.containerCount ?? 0} \u062d\u0627\u0648\u064a\u0629`
      );
    case "DISPOSAL":
      return item.containerNumber
        ? text(
            locale,
            `Disposed from ${item.containerNumber}`,
            `\u0625\u062a\u0644\u0627\u0641 \u0645\u0646 ${item.containerNumber}`
          )
        : text(locale, "Disposed from batch", "\u0625\u062a\u0644\u0627\u0641 \u0645\u0646 \u0627\u0644\u062f\u0641\u0639\u0629");
    case "EVIDENCE":
      return text(locale, "Evidence uploaded", "\u062a\u0645 \u0631\u0641\u0639 \u0645\u0631\u0641\u0642");
    case "INVENTORY_SYNC":
      return text(locale, "Finished-product inventory synchronized", "\u062a\u0645\u062a \u0645\u0632\u0627\u0645\u0646\u0629 \u0645\u062e\u0632\u0648\u0646 \u0627\u0644\u0645\u0646\u062a\u062c \u0627\u0644\u0646\u0647\u0627\u0626\u064a");
    case "STATUS":
    default: {
      const fromStatus = statusLabel(locale, item.fromStatus ?? "NEW");
      const toStatus = statusLabel(locale, item.toStatus ?? "ACTIVE");
      return text(locale, `${fromStatus} to ${toStatus}`, `${fromStatus} \u0625\u0644\u0649 ${toStatus}`);
    }
  }
}

function timelineDetailsV2(locale: string, item: TimelineItem) {
  switch (item.eventType) {
    case "CREATED":
      return item.notes ? `${item.actorName} - ${item.notes}` : item.actorName;
    case "TRANSFER": {
      const extras = [`${item.quantity ?? "0"} ${item.unit ?? ""}`.trim()];
      if (item.notes) extras.push(item.notes);
      if (item.splitCreated) {
        extras.push(
          text(
            locale,
            "Destination container created automatically",
            "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u062d\u0627\u0648\u064a\u0629 \u0648\u062c\u0647\u0629 \u062a\u0644\u0642\u0627\u0626\u064a\u0627"
          )
        );
      }
      return `${item.actorName} - ${extras.join(" - ")}`;
    }
    case "PRINT":
    case "REPRINT": {
      const extras = [item.actorName, item.labelTemplate ?? ""].filter(Boolean);
      if (item.reason) extras.push(item.reason);
      return extras.join(" - ");
    }
    case "SPLIT": {
      const quantities = item.quantities?.length
        ? item.quantities.map((quantity) => `${quantity} ${item.unit ?? ""}`.trim()).join(", ")
        : null;
      const extras = [item.actorName];
      if (item.containerCount) {
        extras.push(text(locale, `${item.containerCount} containers`, `${item.containerCount} \u062d\u0627\u0648\u064a\u0627\u062a`));
      }
      if (quantities) extras.push(quantities);
      return extras.join(" - ");
    }
    case "DISPOSAL": {
      const extras = [item.actorName, `${item.quantity ?? "0"} ${item.unit ?? ""}`.trim()];
      if (item.reason) extras.push(item.reason);
      if (item.notes) extras.push(item.notes);
      return extras.join(" - ");
    }
    case "EVIDENCE":
      return item.fileName ? `${item.actorName} - ${item.fileName}` : item.actorName;
    case "INVENTORY_SYNC": {
      const extras = [item.actorName];
      if (item.inventoryItemCode) extras.push(item.inventoryItemCode);
      if (item.notes) extras.push(item.notes);
      return extras.join(" - ");
    }
    case "STATUS":
    default:
      return item.reason ? `${item.actorName} - ${item.reason}` : item.actorName;
  }
}

function formatTimelineDate(locale: string, value: string) {
  return new Date(value).toLocaleString(isArabicLocale(locale) ? "ar-EG" : "en-US");
}
export default async function BatchDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; batchNumber: string }>;
  searchParams?: Promise<{ view?: string; container?: string }>;
}) {
  const { locale, batchNumber } = await params;
  const query = await searchParams;
  const isScanView = query?.view === "scan";
  const selectedContainerNumber = query?.container;
  let result;
  try {
    result = await getBatchTraceabilityAction({ batchNumber: decodeURIComponent(batchNumber) });
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
  if (!result.success) notFound();
  const batch = result.data;
  const session = await getServerSession();
  const showTransferForm = isScanView && canTransferInventory(session.user.permissions);
  const showTransferDownload = isScanView && canDownloadTransfers(session.user.permissions) && !showTransferForm;
  const [templates, printers] = isScanView
    ? [[], []]
    : await Promise.all([
        getPrintTemplates(true).catch(() => []),
        getPrinters(true).catch(() => [])
      ]);
  const destinationWarehouses = showTransferForm ? await getWarehouses().catch(() => []) : [];
  const selectedContainer = selectedContainerNumber
    ? batch.containers.find((container) => container.containerNumber === selectedContainerNumber)
    : null;

  return (
    <section className="logical-container space-y-6 py-8">
      {!isScanView ? <Link className="text-sm font-semibold text-primary print-hidden" href={`/${locale}/inventory/batches`}>
        Back to batches
      </Link> : null}

      {isScanView ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-primary">Scanned Label</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">{batch.productName}</h1>
          <p className="mt-2 text-sm text-secondary">
            This page shows the batch identity, recipe execution steps, photos, notes, and traceability records linked to the QR/barcode.
          </p>
          {showTransferDownload ? (
            <a
              className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
              href={`/api/inventory/transfers/export?batchNumber=${encodeURIComponent(batch.batchNumber)}`}
            >
              Download warehouse transfers
            </a>
          ) : null}
        </div>
      ) : null}

      {showTransferForm ? (
        <BatchTransferForm
          batchId={batch.id}
          productName={batch.productName}
          batchWarehouseName={batch.warehouseName}
          quantity={batch.remainingQuantity}
          unit={batch.unit}
          destinationWarehouses={destinationWarehouses}
          containers={batch.containers.map((container) => ({
            id: container.id,
            containerNumber: container.containerNumber,
            warehouseName: container.warehouseName,
            remainingQuantity: container.remainingQuantity
          }))}
          defaultContainerId={selectedContainer?.id}
        />
      ) : null}

      <div className="rounded-md border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-secondary">Batch Number</p>
            <h2 className="text-3xl font-bold tracking-normal">{batch.batchNumber}</h2>
            {!isScanView ? <p className="mt-1 text-secondary">{batch.productName}</p> : null}
          </div>
          <Badge>{batch.status}</Badge>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase text-secondary">Produced</dt>
            <dd className="mt-1 font-semibold">
              {batch.producedQuantity} {batch.unit}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-secondary">Remaining</dt>
            <dd className="mt-1 font-semibold">
              {batch.remainingQuantity} {batch.unit}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-secondary">Warehouse</dt>
            <dd className="mt-1 font-semibold">{batch.warehouseName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-secondary">Expiry</dt>
            <dd className="mt-1 font-semibold">{new Date(batch.expiryDate).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      {!isScanView ? (
        <>
          <PrintBatchButton
            batchId={batch.id}
            locale={locale}
            templates={templates}
            printers={printers}
            title="Batch Label"
            description="Queue a thermal label for the full production batch."
          />
          <LabelModal batchId={batch.id} containers={batch.containers.map((container) => ({ id: container.id, containerNumber: container.containerNumber }))} />
        </>
      ) : null}

      {!isScanView ? <div className="grid gap-4 lg:grid-cols-2 print-hidden">
        <SplitModal batchId={batch.id} disabled={batch.containers.length > 0} />
        <DisposalModal batchId={batch.id} containers={batch.containers.map((container) => ({ id: container.id, containerNumber: container.containerNumber }))} />
      </div> : null}

      {batch.recipeDetails ? (
        <div className="rounded-md border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Recipe Snapshot</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase text-secondary">Code</div>
              <div className="font-semibold">{batch.recipeDetails.code}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-secondary">Version</div>
              <div className="font-semibold">v{batch.recipeDetails.version}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-secondary">Storage</div>
              <div className="font-semibold">{batch.recipeDetails.storageInstructions ?? "Default recipe storage"}</div>
            </div>
          </div>
        </div>
      ) : null}

      {batch.productionOrder ? (
        <div className="rounded-md border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{isScanView ? "Recipe Execution Summary" : "Production Order"}</h2>
              <p className="mt-1 text-sm text-secondary">
                {isScanView ? "What was produced, who completed it, and how long it took." : "Scan-ready recipe execution details for order"} {batch.productionOrder.orderNumber}
              </p>
            </div>
            <Badge>{batch.productionOrder.status}</Badge>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase text-secondary">Created By</dt>
              <dd className="mt-1 font-semibold">{batch.productionOrder.createdByName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-secondary">Assigned To</dt>
              <dd className="mt-1 font-semibold">{batch.productionOrder.assignedToName ?? "Not assigned"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-secondary">Completed By</dt>
              <dd className="mt-1 font-semibold">{batch.productionOrder.completedByName ?? "Not completed"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-secondary">Duration</dt>
              <dd className="mt-1 font-semibold">{formatDuration(batch.productionOrder.durationSeconds)}</dd>
            </div>
          </dl>
          {batch.productionOrder.creationNotes ? (
            <div className="mt-4 rounded-md border bg-surface-subtle p-3 text-sm">
              <div className="font-semibold">Creation Notes</div>
              <p className="mt-1 whitespace-pre-wrap text-secondary">{batch.productionOrder.creationNotes}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <ScaledIngredientsCard
        title={isScanView ? "Recipe Ingredients" : "Production Ingredients"}
        description={
          batch.recipeScaleMode === "produced"
            ? "Quantities below reflect the actual completed production quantity."
            : "Quantities below reflect the recipe yield linked to this batch."
        }
        ingredients={batch.recipeIngredients}
        baseYieldQuantity={batch.recipeBaseYieldQuantity}
        baseYieldUnit={batch.recipeBaseYieldUnit}
        scaledQuantity={batch.recipeScaledQuantity}
        scaledUnit={batch.recipeScaledUnit}
        scaleMode={batch.recipeScaleMode}
      />

      {batch.productionSteps?.length ? (
        <div className="rounded-md border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">{isScanView ? "Recipe Instructions, Photos & Notes" : "Recipe Steps, Photos & Notes"}</h2>
          <p className="mt-1 text-sm text-secondary">
            {isScanView ? "Follow each step below. Photos and notes are the recorded production evidence." : "This is the traceability view opened by scanning the label QR/barcode."}
          </p>
          <div className="mt-4 grid gap-4">
            {batch.productionSteps.map((step) => (
              <article key={step.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-secondary">Step {step.stepNumber}</div>
                    <h3 className="mt-1 text-lg font-bold">{step.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{step.isCompleted ? "Completed" : "Pending"}</Badge>
                    {step.requiresPhoto ? <Badge className="bg-surface-subtle">Photo required</Badge> : null}
                    {step.requiresNotes ? <Badge className="bg-surface-subtle">Notes required</Badge> : null}
                    {step.requiresQuantity ? <Badge className="bg-surface-subtle">Quantity required</Badge> : null}
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-secondary">{step.instructions}</p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="font-semibold text-secondary">Estimated</dt>
                    <dd>{step.estimatedMinutes ? `${step.estimatedMinutes} min` : "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-secondary">Completed By</dt>
                    <dd>{step.completedByName ?? "Not completed"}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-secondary">Confirmed Quantity</dt>
                    <dd>{step.confirmedQuantity ? `${step.confirmedQuantity} ${step.confirmedUnit ?? batch.unit}` : "Not recorded"}</dd>
                  </div>
                </dl>

                {step.photos.length ? (
                  <div className="mt-4">
                    <h4 className="text-sm font-bold">Photos</h4>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {step.photos.map((photo) => (
                        <figure key={photo.id} className="overflow-hidden rounded-md border bg-surface-subtle">
                          {photo.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={photo.url} alt={`Evidence for step ${step.stepNumber}`} className="h-44 w-full object-cover" />
                          ) : (
                            <div className="flex h-44 items-center justify-center text-sm text-secondary">Photo unavailable</div>
                          )}
                          <figcaption className="p-2 text-xs text-secondary">
                            {photo.uploadedByName} · {new Date(photo.uploadedAt).toLocaleString()}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                ) : null}

                {step.notes.length ? (
                  <div className="mt-4">
                    <h4 className="text-sm font-bold">Notes</h4>
                    <div className="mt-2 grid gap-2">
                      {step.notes.map((note) => (
                        <div key={note.id} className="rounded-md border bg-surface-subtle p-3 text-sm">
                          <p className="whitespace-pre-wrap">{note.content}</p>
                          <div className="mt-2 text-xs text-secondary">
                            {note.addedByName} · {new Date(note.addedAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!isScanView || batch.containers.length > 0 ? <div className="rounded-md border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Containers</h2>
        <div className="mt-3 grid gap-2">
          {batch.containers.map((container) => (
            <div
              key={container.id}
              className={cn(
                "grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:items-start",
                selectedContainerNumber === container.containerNumber ? "border-primary bg-accent/30" : ""
              )}
            >
              <span className="font-semibold">{container.containerNumber}</span>
              <span>{container.quantity} {batch.unit}</span>
              <span>{container.remainingQuantity} remaining</span>
              <span>{container.warehouseName}</span>
              <Badge>{container.status}</Badge>
              <PrintBatchButton
                targetType="CONTAINER"
                targetId={container.id}
                locale={locale}
                templates={templates}
                printers={printers}
                buttonLabel="Print sticker"
                compact
              />
            </div>
          ))}
          {batch.containers.length === 0 ? <p className="text-sm text-secondary">No container splits recorded.</p> : null}
        </div>
      </div> : null}

      <div className="rounded-md border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">
          {isScanView
            ? text(locale, "Batch Activity Timeline", "\u0627\u0644\u062e\u0637 \u0627\u0644\u0632\u0645\u0646\u064a \u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u062f\u0641\u0639\u0629")
            : text(locale, "Traceability Timeline", "\u0627\u0644\u062e\u0637 \u0627\u0644\u0632\u0645\u0646\u064a \u0644\u0644\u062a\u062a\u0628\u0639")}
        </h2>
        <div className="mt-3 grid gap-2">
          {batch.timeline.length ? batch.timeline.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{timelineTitleV2(locale, item)}</span>
                  {false ? <Badge className={timelineBadgeClassNameV2(item.eventType)}>
                    {item.eventType === "TRANSFER" ? (locale === "ar" ? "تحويل" : "Transfer") : locale === "ar" ? "حالة" : "Status"}
                  </Badge> : <Badge className={timelineBadgeClassNameV2(item.eventType)}>{timelineBadgeLabelV2(locale, item.eventType)}</Badge>}
                </div>
                <span className="text-sm text-secondary">{formatTimelineDate(locale, item.occurredAt)}</span>
              </div>
              <p className="mt-1 text-sm text-secondary">{timelineDetailsV2(locale, item)}</p>
            </div>
          )) : (
            <p className="rounded-md border border-dashed p-3 text-sm text-secondary">
              {text(locale, "No activity recorded yet.", "\u0644\u0627 \u064a\u0648\u062c\u062f \u0646\u0634\u0627\u0637 \u0645\u0633\u062c\u0644 \u0628\u0639\u062f.")}
            </p>
          )}
        </div>
      </div>

      {!isScanView && batch.printHistory ? (
        <div className="rounded-md border bg-white p-5 shadow-sm print-hidden">
          <h2 className="text-xl font-bold">Print History</h2>
          <div className="mt-3 grid gap-2">
            {batch.printHistory.map((item) => (
              <div key={item.id} className="rounded-md border p-3 text-sm">
                <span className="font-semibold">{item.labelTemplate}</span> printed by {item.printedByName} on {new Date(item.printedAt).toLocaleString()}
                {item.containerNumber ? <span className="ml-2 font-semibold text-primary">Container: {item.containerNumber}</span> : null}
                {item.isReprint ? <span className="ml-2 text-warning">Reprint: {item.reprintReason}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!isScanView && batch.disposals ? (
        <div className="rounded-md border bg-white p-5 shadow-sm print-hidden">
          <h2 className="text-xl font-bold">Disposals</h2>
          <div className="mt-3 grid gap-2">
            {batch.disposals.map((item) => (
              <div key={item.id} className="rounded-md border p-3 text-sm">
                <span className="font-semibold">{item.quantityDisposed} {batch.unit}</span> disposed for {item.reason} by {item.disposedByName}
                {item.notes ? <div className="text-secondary">{item.notes}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!isScanView ? <div className="print-hidden">
        <EvidenceUploader batchId={batch.id} />
        {batch.evidence?.length ? (
          <div className="mt-4 rounded-md border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Evidence Files</h2>
            <div className="mt-3 grid gap-2">
              {batch.evidence.map((item) => (
                <a key={item.id} className="rounded-md border p-3 text-sm font-semibold text-primary" href={item.fileUrl} target="_blank" rel="noreferrer">
                  {item.fileName}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div> : null}
    </section>
  );
}
