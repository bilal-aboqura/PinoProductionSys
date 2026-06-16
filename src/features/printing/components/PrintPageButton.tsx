"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintPageButton({ label = "Print Summary", variant = "secondary" }: { label?: string; variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <Button variant={variant} onClick={() => window.print()} className="print-hidden">
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
