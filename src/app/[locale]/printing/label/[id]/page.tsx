import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { PrintControls } from "@/features/printing/components/PrintControls";
import { getPrintJob } from "@/features/printing/queries";
import { getServerSession } from "@/lib/auth";
import "./print.css";

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : null;
}

export default async function LabelPrintPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  try {
    await getServerSession();
  } catch {
    redirect(`/${locale}/login`);
  }

  const job = await getPrintJob(id);
  if (!job) notFound();
  const payload = job.payload;
  const copies = Array.from({ length: job.quantity }, (_, index) => index);

  return (
    <main className="print-label-page">
      <PrintControls jobId={job.id} />
      <div className="print-label-stack">
        {copies.map((copy) => (
          <section key={copy} className="thermal-label shadow-sm" data-size={job.templateDimensions}>
            <div>
              <p className="m-0 text-[7pt] font-bold uppercase">{payload.subtitle ?? job.targetType}</p>
              <h1>{payload.title}</h1>
              <dl>
                {payload.batchNumber ? (
                  <div>
                    <dt>Batch</dt>
                    <dd>{payload.batchNumber}</dd>
                  </div>
                ) : null}
                {payload.containerNumber ? (
                  <div>
                    <dt>Container</dt>
                    <dd>{payload.containerNumber}</dd>
                  </div>
                ) : null}
                {payload.warehouseName ? (
                  <div>
                    <dt>Warehouse</dt>
                    <dd>{payload.warehouseName}</dd>
                  </div>
                ) : null}
                {payload.quantity ? (
                  <div>
                    <dt>Quantity</dt>
                    <dd>
                      {payload.quantity} {payload.unit}
                    </dd>
                  </div>
                ) : null}
                {payload.productionDate ? (
                  <div>
                    <dt>Produced</dt>
                    <dd>{formatDate(payload.productionDate)}</dd>
                  </div>
                ) : null}
                {payload.expiryDate ? (
                  <div>
                    <dt>Expiry</dt>
                    <dd>{formatDate(payload.expiryDate)}</dd>
                  </div>
                ) : null}
                {payload.storageInstructions ? (
                  <div>
                    <dt>Storage</dt>
                    <dd>{payload.storageInstructions}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <div className="grid place-items-center gap-1 text-center text-[6pt]">
              <Image src={payload.qrCodeImage} alt={`QR code for ${payload.title}`} width={160} height={160} unoptimized />
              <span>{payload.qrCodeData}</span>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
