import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Transfer = {
  id: string;
  timestamp: Date;
  quantity: { toString(): string };
  notes: string | null;
  user: { displayName: string };
  item: { code: string; nameEn: string; unit: string };
  sourceWh: { code: string; name: string };
  destWh: { code: string; name: string };
};

export function TransferHistoryTable({ transfers }: { transfers: Transfer[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((transfer) => (
            <TableRow key={transfer.id}>
              <TableCell>{transfer.timestamp.toLocaleString()}</TableCell>
              <TableCell>{transfer.user.displayName}</TableCell>
              <TableCell>{transfer.item.code} - {transfer.item.nameEn}</TableCell>
              <TableCell>{transfer.sourceWh.code} - {transfer.sourceWh.name}</TableCell>
              <TableCell>{transfer.destWh.code} - {transfer.destWh.name}</TableCell>
              <TableCell className="text-right">{transfer.quantity.toString()} {transfer.item.unit}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
