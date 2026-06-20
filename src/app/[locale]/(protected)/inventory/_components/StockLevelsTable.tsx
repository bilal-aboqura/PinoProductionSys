import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BalanceDto } from "@/features/inventory/types";
import { EmptyState } from "./EmptyState";
import { useTranslations } from "next-intl";

export function StockLevelsTable({ balances }: { balances: BalanceDto[] }) {
  const t = useTranslations("workspace");
  const common = useTranslations("common");
  if (balances.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState title={t("noStockBalances")} description={t("noStockBalancesDescription")} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("items")}</TableHead>
              <TableHead>{t("arabicName")}</TableHead>
              <TableHead>{t("category")}</TableHead>
              <TableHead>{t("warehouse")}</TableHead>
              <TableHead className="text-right">{t("current")}</TableHead>
              <TableHead className="text-right">{t("available")}</TableHead>
              <TableHead>{common("status")}</TableHead>
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
                    {balance.isNegativeStock ? <Badge className="bg-error/15 text-error">{t("negative")}</Badge> : null}
                    {balance.isLowStock ? <Badge className="bg-warning/15 text-secondary">{t("lowStock")}</Badge> : null}
                    {balance.needsReconciliation ? <Badge>{t("reconcile")}</Badge> : null}
                    {!balance.isNegativeStock && !balance.isLowStock && !balance.needsReconciliation ? <Badge>{t("healthy")}</Badge> : null}
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
