import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Adjustment = {
  id: string;
  timestamp: Date;
  quantityDelta: { toString(): string };
  reason: string;
  notes: string | null;
  user: { displayName: string };
  inventoryItem: { code: string; nameEn: string; unit: string };
  warehouse: { code: string; name: string };
};

export function AdjustmentHistoryTable({ adjustments }: { adjustments: Adjustment[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead className="text-right">Delta</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adjustments.map((adjustment) => (
            <TableRow key={adjustment.id}>
              <TableCell>{adjustment.timestamp.toLocaleString()}</TableCell>
              <TableCell>{adjustment.user.displayName}</TableCell>
              <TableCell>{adjustment.inventoryItem.code} - {adjustment.inventoryItem.nameEn}</TableCell>
              <TableCell>{adjustment.warehouse.code} - {adjustment.warehouse.name}</TableCell>
              <TableCell className="text-right">{adjustment.quantityDelta.toString()} {adjustment.inventoryItem.unit}</TableCell>
              <TableCell>{adjustment.reason}</TableCell>
              <TableCell>{adjustment.notes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
