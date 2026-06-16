import { AccessDenied } from "@/components/shared/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getInventoryCategories, getInventoryItems } from "@/features/inventory/queries";
import { getServerSession } from "@/lib/auth";
import { InventoryBreadcrumb } from "../_components/InventoryBreadcrumb";
import { EmptyState } from "../_components/EmptyState";
import { ItemForm } from "./_components/ItemForm";

export default async function InventoryItemsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  let items;
  let categories;
  let session;
  try {
    [items, categories, session] = await Promise.all([getInventoryItems({}), getInventoryCategories(), getServerSession()]);
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
  const canManage = session.user.permissions.includes("inventory:manage");

  return (
    <section className="logical-container space-y-6 py-8">
      <InventoryBreadcrumb locale={locale} current="Catalog" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">Inventory Catalog</p>
          <h1 className="text-3xl font-bold">Items</h1>
        </div>
        <a href={`/${locale}/inventory/warehouses`}>
          <Button variant="secondary">Warehouses</Button>
        </a>
      </div>
      <ItemForm categories={categories} canManage={canManage} />
      {items.length === 0 ? (
        <EmptyState title="No inventory items yet" />
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Arabic Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Status</TableHead>
                {canManage ? <TableHead>Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold">{item.code}</TableCell>
                  <TableCell>{item.nameEn}</TableCell>
                  <TableCell>{item.nameAr}</TableCell>
                  <TableCell>{item.itemType}</TableCell>
                  <TableCell>{item.categoryName}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.minStockLevel}</TableCell>
                  <TableCell>{item.isActive ? <Badge>Active</Badge> : <Badge className="bg-muted/20">Inactive</Badge>}</TableCell>
                  {canManage ? (
                    <TableCell>
                      <ItemForm categories={categories} item={item} canManage={canManage} />
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
