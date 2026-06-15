import type { LabelTemplate } from "@prisma/client";
import type { LabelData } from "@/features/batches/types";
import { cn } from "@/lib/utils";

const sizes: Record<LabelTemplate, string> = {
  SMALL: "h-[50mm] w-[50mm]",
  STANDARD: "h-[50mm] w-[100mm]",
  LARGE: "h-[100mm] w-[100mm]"
};

export function LabelPrintLayout({ label, template }: { label: LabelData; template: LabelTemplate }) {
  const compact = template === "SMALL";
  return (
    <div className="label-print-root">
      <section
        className={cn(
          "label-print-sheet grid overflow-hidden rounded-sm border border-foreground bg-white p-2 text-foreground",
          sizes[template],
          compact ? "grid-rows-[auto_1fr_auto]" : "grid-cols-[1fr_auto] gap-3"
        )}
      >
        <div className={compact ? "space-y-1" : "space-y-2"}>
          <div>
            <p className={cn("font-bold leading-tight", compact ? "text-[10px]" : "text-base")}>{label.productName}</p>
            <p className={cn("font-semibold text-secondary", compact ? "text-[8px]" : "text-xs")}>{label.productCode}</p>
          </div>
          <div className={cn("grid gap-1", compact ? "text-[8px]" : "text-xs")}>
            <div>
              <span className="font-semibold">Batch:</span> {label.batchNumber}
            </div>
            {label.containerNumber ? (
              <div>
                <span className="font-semibold">Container:</span> {label.containerNumber}
              </div>
            ) : null}
            <div>
              <span className="font-semibold">Qty:</span> {label.quantity.toFixed(3)} {label.unit}
            </div>
            <div>
              <span className="font-semibold">Prod:</span> {new Date(label.productionDate).toLocaleDateString()}
            </div>
            <div>
              <span className="font-semibold">Exp:</span> {new Date(label.expiryDate).toLocaleDateString()}
            </div>
            {label.warehouseName ? <div>{label.warehouseName}</div> : null}
          </div>
          {!compact && label.storageInstructions ? <p className="line-clamp-2 text-xs text-secondary">{label.storageInstructions}</p> : null}
        </div>
        <div className={cn("flex items-end justify-end", compact ? "mt-1" : "")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={compact ? "h-16 w-16" : "h-28 w-28"} src={label.qrCodeData} alt={`QR code for ${label.batchNumber}`} />
        </div>
      </section>
    </div>
  );
}
