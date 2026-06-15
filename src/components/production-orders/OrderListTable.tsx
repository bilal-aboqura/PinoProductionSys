"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductionOrderListItemDto } from "@/features/production-orders/types";
import { OrderStatusBadge } from "./OrderStatusBadge";

export function OrderListTable({ orders, locale }: { orders: ProductionOrderListItemDto[]; locale: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesQuery =
        !needle ||
        order.orderNumber.toLowerCase().includes(needle) ||
        order.recipeName.toLowerCase().includes(needle) ||
        (order.assignedToName ?? "").toLowerCase().includes(needle);
      return matchesQuery && (!status || order.status === status);
    });
  }, [orders, query, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-secondary" />
          <Input className="pl-9" placeholder="Search orders" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <select className="h-10 rounded-md border bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="PENDING_UNASSIGNED">Pending unassigned</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <Link className="ms-auto" href={`/${locale}/production/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>
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
            {visible.map((order) => (
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
            {visible.length === 0 ? (
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
