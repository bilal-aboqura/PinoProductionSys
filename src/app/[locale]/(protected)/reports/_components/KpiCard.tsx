import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function KpiCard({ title, value, detail, icon: Icon }: { title: string; value: string | number; detail?: string; icon: LucideIcon }) {
  return (
    <Card className="rounded-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-semibold text-secondary">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold">{value}</div>
        {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
