import { AccessDenied } from "@/components/shared/AccessDenied";
import { getPrinters } from "@/features/printing/queries";
import { PrinterManagementClient } from "./PrinterManagementClient";

export default async function PrintersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  try {
    const printers = await getPrinters(false);
    return (
      <section className="logical-container space-y-6 py-8">
        <div>
          <p className="text-sm font-semibold text-secondary">Administration</p>
          <h1 className="text-3xl font-bold">Printers</h1>
        </div>
        <PrinterManagementClient printers={printers} />
      </section>
    );
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
}
