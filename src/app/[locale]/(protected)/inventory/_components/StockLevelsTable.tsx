import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BalanceDto } from "@/features/inventory/types";
import { EmptyState } from "./EmptyState";
import { StockSearchInput } from "./StockSearchInput";

export function StockLevelsTable({ balances, search }: { balances: BalanceDto[]; search?: string }) {
  if (balances.length === 0) {
    return (
      <div className="space-y-3">
        <StockSearchInput initialValue={search} />
        <EmptyState title="No stock balances found" description="Create items and record adjustments to start building inventory." />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StockSearchInput initialValue={search} />
      <div className="overflow-x-auto rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Arabic Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((balance) => (
              <TableRow key={balance.id} className={balance.isNegativeStock ? "bg-error/10" : balance.isLowStock ? "bg-warning/10" : undefined}>
                <TableCell>
                  <div className="font-semibold">{balance.itemCode}</div>
                  <div className="text-sm text-muted">{balance.nameEn}</div>
                </TableCell>
                <TableCell>{balance.nameAr}</TableCell>
                <TableCell>{balance.categoryName}</TableCell>
                <TableCell>
                  <div className="font-semibold">{balance.warehouseCode}</div>
                  <div className="text-sm text-muted">{balance.warehouseName}</div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {balance.currentQuantity} {balance.unit}
                </TableCell>
                <TableCell className="text-right">
                  {balance.availableQuantity} {balance.unit}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {balance.isNegativeStock ? <Badge className="bg-error/15 text-error">Negative</Badge> : null}
                    {balance.isLowStock ? <Badge className="bg-warning/15 text-secondary">Low stock</Badge> : null}
                    {balance.needsReconciliation ? <Badge>Reconcile</Badge> : null}
                    {!balance.isNegativeStock && !balance.isLowStock && !balance.needsReconciliation ? <Badge>Healthy</Badge> : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
