import { AccessDenied } from "@/components/shared/AccessDenied";
import { Pagination } from "@/components/shared/Pagination";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getInventoryCategories, getInventoryItemList } from "@/features/inventory/queries";
import { getServerSession } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { InventoryBreadcrumb } from "../_components/InventoryBreadcrumb";
import { EmptyState } from "../_components/EmptyState";
import { ItemForm } from "./_components/ItemForm";
import { getTranslations } from "next-intl/server";

export default async function InventoryItemsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { locale } = await params;
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "workspace" }),
    getTranslations({ locale, namespace: "common" })
  ]);
  const query = await searchParams;
  let itemPage;
  let categories;
  let session;
  try {
    [itemPage, categories, session] = await Promise.all([
      getInventoryItemList({ search: query.search, page: parsePage(query.page), pageSize: 25 }),
      getInventoryCategories(),
      getServerSession()
    ]);
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
  const canManage = session.user.permissions.includes("inventory:manage");

  return (
    <section className="logical-container space-y-6 py-8">
      <InventoryBreadcrumb locale={locale} current={t("catalog")} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">{t("inventoryCatalog")}</p>
          <h1 className="text-3xl font-bold">{t("items")}</h1>
        </div>
        <a href={`/${locale}/inventory/warehouses`}>
          <Button variant="secondary">{t("warehouses")}</Button>
        </a>
      </div>
      <form className="flex flex-wrap gap-2 rounded-md border bg-white p-4">
        <SearchCombobox className="min-w-64 flex-1" name="search" source="inventory-items" defaultValue={query.search} placeholder={t("selectItem")} />
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white" type="submit">{common("search")}</button>
      </form>
      <ItemForm categories={categories} canManage={canManage} />
      {itemPage.items.length === 0 ? (
        <EmptyState title={t("noInventoryItems")} />
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("arabicName")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead>{t("unit")}</TableHead>
                <TableHead>{t("minStock")}</TableHead>
                <TableHead>{common("status")}</TableHead>
                {canManage ? <TableHead>{common("actions")}</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemPage.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold">{item.code}</TableCell>
                  <TableCell>{item.nameEn}</TableCell>
                  <TableCell>{item.nameAr}</TableCell>
                  <TableCell>{item.itemType}</TableCell>
                  <TableCell>{item.categoryName}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.minStockLevel}</TableCell>
                  <TableCell>{item.isActive ? <Badge>{common("active")}</Badge> : <Badge className="bg-muted/20">{common("inactive")}</Badge>}</TableCell>
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
      <Pagination
        pathname={`/${locale}/inventory/items`}
        page={itemPage.page}
        totalPages={itemPage.totalPages}
        totalItems={itemPage.total}
        searchParams={query}
        itemLabel={t("items").toLocaleLowerCase(locale)}
      />
    </section>
  );
}
