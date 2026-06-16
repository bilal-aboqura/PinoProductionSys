import { AccessDenied } from "@/components/shared/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWarehouses } from "@/features/inventory/queries";
import { getServerSession } from "@/lib/auth";
import { EmptyState } from "../_components/EmptyState";
import { InventoryBreadcrumb } from "../_components/InventoryBreadcrumb";
import { WarehouseForm } from "./_components/WarehouseForm";

export default async function WarehousesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
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
      <InventoryBreadcrumb locale={locale} current="Warehouses" />
      <div>
        <p className="text-sm font-semibold text-secondary">Warehouse Management</p>
        <h1 className="text-3xl font-bold">Warehouses</h1>
      </div>
      <WarehouseForm canManage={canManage} />
      {warehouses.length === 0 ? (
        <EmptyState title="No warehouses yet" />
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                {canManage ? <TableHead>Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-semibold">{warehouse.code}</TableCell>
                  <TableCell>{warehouse.name}</TableCell>
                  <TableCell>{warehouse.description}</TableCell>
                  <TableCell>{warehouse.isActive ? <Badge>Active</Badge> : <Badge className="bg-muted/20">Inactive</Badge>}</TableCell>
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
