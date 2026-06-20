"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductionOrderListItemDto } from "@/features/production-orders/types";
import { OrderStatusBadge } from "./OrderStatusBadge";

export function OrderListTable({ orders, locale, defaultFilters = {} }: { orders: ProductionOrderListItemDto[]; locale: string; defaultFilters?: { search?: string; status?: string } }) {
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-3">
        <SearchCombobox className="w-full max-w-sm" name="search" source="production-orders" placeholder="Select order number or recipe" defaultValue={defaultFilters.search} />
        <select className="h-10 rounded-md border bg-white px-3 text-sm" name="status" defaultValue={defaultFilters.status ?? ""}>
          <option value="">All statuses</option>
          <option value="PENDING_UNASSIGNED">Pending unassigned</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <Button type="submit" variant="secondary">Apply</Button>
      </form>
      <div className="overflow-x-auto rounded-md border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Recipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-16">Open</TableHead>
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
                <TableCell>{order.assignedToName ?? "Unassigned"}</TableCell>
                <TableCell>{order.targetQuantity ? `${order.targetQuantity} ${order.yieldUnit}` : "Not set"}</TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Link href={`/${locale}/production/${order.id}`}>
                    <Button className="h-9 w-9 px-0" variant="ghost" title="Open">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-secondary" colSpan={7}>
                  No production orders found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
