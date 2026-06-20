import { AccessDenied } from "@/components/shared/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWarehouses } from "@/features/inventory/queries";
import { getServerSession } from "@/lib/auth";
import { EmptyState } from "../_components/EmptyState";
import { InventoryBreadcrumb } from "../_components/InventoryBreadcrumb";
import { WarehouseForm } from "./_components/WarehouseForm";
import { getTranslations } from "next-intl/server";

export default async function WarehousesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "workspace" }),
    getTranslations({ locale, namespace: "common" })
  ]);
  let warehouses;
  let session;
  try {
    [warehouses, session] = await Promise.all([getWarehouses(false), getServerSession()]);
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
  const canManage = session.user.permissions.includes("inventory:manage");

  return (
    <section className="logical-container space-y-6 py-8">
      <InventoryBreadcrumb locale={locale} current={t("warehouses")} />
      <div>
        <p className="text-sm font-semibold text-secondary">{t("warehouseManagement")}</p>
        <h1 className="text-3xl font-bold">{t("warehouses")}</h1>
      </div>
      <WarehouseForm canManage={canManage} />
      {warehouses.length === 0 ? (
        <EmptyState title={t("noWarehouses")} />
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("description")}</TableHead>
                <TableHead>{common("status")}</TableHead>
                {canManage ? <TableHead>{common("actions")}</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-semibold">{warehouse.code}</TableCell>
                  <TableCell>{warehouse.name}</TableCell>
                  <TableCell>{warehouse.description}</TableCell>
                  <TableCell>{warehouse.isActive ? <Badge>{common("active")}</Badge> : <Badge className="bg-muted/20">{common("inactive")}</Badge>}</TableCell>
                  {canManage ? (
                    <TableCell>
                      <WarehouseForm warehouse={warehouse} canManage={canManage} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
