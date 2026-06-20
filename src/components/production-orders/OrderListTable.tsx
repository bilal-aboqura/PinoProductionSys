"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductionOrderListItemDto } from "@/features/production-orders/types";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { useTranslations } from "next-intl";

export function OrderListTable({ orders, locale, defaultFilters = {} }: { orders: ProductionOrderListItemDto[]; locale: string; defaultFilters?: { search?: string; status?: string } }) {
  const t = useTranslations("workspace");
  const common = useTranslations("common");
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-3">
        <SearchCombobox className="w-full max-w-sm" name="search" source="production-orders" placeholder={t("selectOrder")} defaultValue={defaultFilters.search} />
        <select className="h-10 rounded-md border bg-white px-3 text-sm" name="status" defaultValue={defaultFilters.status ?? ""}>
          <option value="">{t("allStatuses")}</option>
          <option value="PENDING_UNASSIGNED">{t("pendingUnassigned")}</option>
          <option value="PENDING">{t("pending")}</option>
          <option value="IN_PROGRESS">{t("inProgress")}</option>
          <option value="COMPLETED">{t("completed")}</option>
          <option value="CANCELLED">{t("cancelled")}</option>
        </select>
        <Button type="submit" variant="secondary">{t("apply")}</Button>
      </form>
      <div className="overflow-x-auto rounded-md border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("orderNumber")}</TableHead>
              <TableHead>{t("recipe")}</TableHead>
              <TableHead>{common("status")}</TableHead>
              <TableHead>{t("assignedTo")}</TableHead>
              <TableHead>{t("target")}</TableHead>
              <TableHead>{t("created")}</TableHead>
              <TableHead className="w-16">{t("open")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                <TableCell className="font-semibold">{order.recipeName}</TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell>{order.assignedToName ?? t("unassigned")}</TableCell>
                <TableCell>{order.targetQuantity ? `${order.targetQuantity} ${order.yieldUnit}` : t("notSet")}</TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleString(locale)}</TableCell>
                <TableCell>
                  <Link href={`/${locale}/production/${order.id}`}>
                    <Button className="h-9 w-9 px-0" variant="ghost" title={t("open")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-secondary" colSpan={7}>
                  {t("noProductionOrders")}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
