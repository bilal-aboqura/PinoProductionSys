import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MasterEntityDto, MasterEntityType } from "@/features/settings/types";
import { MasterDataForm } from "./MasterDataForm";

export function MasterDataSection({
  title,
  description,
  entityType,
  items,
  canManage
}: {
  title: string;
  description: string;
  entityType: MasterEntityType;
  items: MasterEntityDto[];
  canManage: boolean;
}) {
  return (
    <section className="logical-container space-y-6 py-8">
      <div>
        <p className="text-sm font-semibold text-secondary">Settings</p>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-secondary">{description}</p>
      </div>
      <MasterDataForm entityType={entityType} canManage={canManage} />
      <div className="overflow-x-auto rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Arabic</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? <TableHead>Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-semibold">{item.code ?? "-"}</TableCell>
                <TableCell>{item.nameEn ?? item.name ?? "-"}</TableCell>
                <TableCell>{item.nameAr ?? "-"}</TableCell>
                <TableCell>
                  {item.dimensions ?? item.description ?? ""}
                  {item.minTemperature || item.maxTemperature ? (
                    <span className="block text-xs text-secondary">
                      {item.minTemperature ?? "-"} to {item.maxTemperature ?? "-"} C
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>{item.isActive ? <Badge>Active</Badge> : <Badge className="bg-muted/20">Archived</Badge>}</TableCell>
                {canManage ? (
                  <TableCell className="min-w-[22rem]">
                    <MasterDataForm entityType={entityType} item={item} canManage={canManage} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
