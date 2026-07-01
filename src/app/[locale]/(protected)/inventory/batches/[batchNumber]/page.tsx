import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { ScaledIngredientsCard } from "@/components/recipes/ScaledIngredientsCard";
import { getBatchTraceabilityAction } from "@/features/batches/queries";
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
  const showTransferDownload = isScanView && canDownloadTransfers(session.user.permissions);
  const showTransferForm = isScanView && canTransferInventory(session.user.permissions);
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
  const transferTarget = selectedContainer
    ? {
        batchId: batch.id,
        containerId: selectedContainer.id,
        sourceWarehouseName: selectedContainer.warehouseName,
        quantity: selectedContainer.remainingQuantity
      }
    : batch.containers.length === 0
      ? {
          batchId: batch.id,
          sourceWarehouseName: batch.warehouseName,
          quantity: batch.remainingQuantity
        }
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

      {showTransferForm && transferTarget ? (
        <BatchTransferForm
          batchId={transferTarget.batchId}
          containerId={transferTarget.containerId}
          productName={batch.productName}
          sourceWarehouseName={transferTarget.sourceWarehouseName}
          quantity={transferTarget.quantity}
          unit={batch.unit}
          destinationWarehouses={destinationWarehouses}
        />
      ) : null}

      {showTransferForm && !transferTarget && batch.containers.length > 0 ? (
        <div className="rounded-md border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Transfer Finished Product</h2>
          <p className="mt-2 text-sm text-secondary">Scan a specific container label to transfer that container directly from the traceability page.</p>
        </div>
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
        <h2 className="text-xl font-bold">{isScanView ? "Batch Status Timeline" : "Traceability Timeline"}</h2>
        <div className="mt-3 grid gap-2">
          {batch.statusHistory.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {item.fromStatus ?? "NEW"} to {item.toStatus}
                </span>
                <span className="text-sm text-secondary">{new Date(item.changedAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm text-secondary">
                {item.changedByName} {item.reason ? `- ${item.reason}` : ""}
              </p>
            </div>
          ))}
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
