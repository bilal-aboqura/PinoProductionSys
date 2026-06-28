import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { getBatchTraceabilityAction } from "@/features/batches/queries";
import { PrintBatchButton } from "@/features/printing/components/PrintBatchButton";
import { getPrinters, getPrintTemplates } from "@/features/printing/queries";
import { DisposalModal } from "../_components/DisposalModal";
import { EvidenceUploader } from "../_components/EvidenceUploader";
import { LabelModal } from "../_components/LabelModal";
import { SplitModal } from "../_components/SplitModal";
import { cn } from "@/lib/utils";

export default async function BatchDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; batchNumber: string }>;
  searchParams?: Promise<{ container?: string }>;
}) {
  const { locale, batchNumber } = await params;
  const selectedContainerNumber = (await searchParams)?.container;
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
  const [templates, printers] = await Promise.all([
    getPrintTemplates(true).catch(() => []),
    getPrinters(true).catch(() => [])
  ]);

  return (
    <section className="logical-container space-y-6 py-8">
      <Link className="text-sm font-semibold text-primary print-hidden" href={`/${locale}/inventory/batches`}>
        Back to batches
      </Link>

      <div className="rounded-md border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-normal">{batch.batchNumber}</h1>
            <p className="mt-1 text-secondary">{batch.productName}</p>
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

      <PrintBatchButton
        batchId={batch.id}
        locale={locale}
        templates={templates}
        printers={printers}
        title="Batch Label"
        description="Queue a thermal label for the full production batch."
      />
      <LabelModal batchId={batch.id} containers={batch.containers.map((container) => ({ id: container.id, containerNumber: container.containerNumber }))} />

      <div className="grid gap-4 lg:grid-cols-2 print-hidden">
        <SplitModal batchId={batch.id} disabled={batch.containers.length > 0} />
        <DisposalModal batchId={batch.id} containers={batch.containers.map((container) => ({ id: container.id, containerNumber: container.containerNumber }))} />
      </div>

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

      <div className="rounded-md border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Containers</h2>
        <div className="mt-3 grid gap-2">
          {batch.containers.map((container) => (
            <div
              key={container.id}
              className={cn(
                "grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-start",
                selectedContainerNumber === container.containerNumber ? "border-primary bg-accent/30" : ""
              )}
            >
              <span className="font-semibold">{container.containerNumber}</span>
              <span>{container.quantity} {batch.unit}</span>
              <span>{container.remainingQuantity} remaining</span>
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
      </div>

      <div className="rounded-md border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Traceability Timeline</h2>
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

      {batch.printHistory ? (
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

      {batch.disposals ? (
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

      <div className="print-hidden">
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
      </div>
    </section>
  );
}
