import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Waste = {
  id: string;
  timestamp: Date;
  quantity: { toString(): string };
  reason: string;
  notes: string | null;
  user: { displayName: string };
  inventoryItem: { code: string; nameEn: string; unit: string };
  warehouse: { code: string; name: string };
};

export function WasteHistoryTable({ wasteRecords }: { wasteRecords: Waste[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wasteRecords.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.timestamp.toLocaleString()}</TableCell>
              <TableCell>{record.user.displayName}</TableCell>
              <TableCell>{record.inventoryItem.code} - {record.inventoryItem.nameEn}</TableCell>
              <TableCell>{record.warehouse.code} - {record.warehouse.name}</TableCell>
              <TableCell className="text-right">{record.quantity.toString()} {record.inventoryItem.unit}</TableCell>
              <TableCell>{record.reason}</TableCell>
              <TableCell>{record.notes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
