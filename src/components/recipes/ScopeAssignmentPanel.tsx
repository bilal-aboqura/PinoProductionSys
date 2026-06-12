"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assignScope, removeScope } from "@/features/recipes/actions";
import type { RecipeAssignmentDto } from "@/features/recipes/types";

export function ScopeAssignmentPanel({ recipeId, assignments }: { recipeId: string; assignments: RecipeAssignmentDto[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await assignScope(recipeId, {
        scopeType: String(formData.get("scopeType")),
        scopeId: String(formData.get("scopeId"))
      });
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Scope Assignments</h2>
      <div className="space-y-2">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2">
            <span className="text-sm font-semibold">{assignment.scopeType}: {assignment.scopeId}</span>
            <Button
              className="h-9 w-9 px-0"
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => startTransition(async () => {
                await removeScope(recipeId, assignment.id);
                router.refresh();
              })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <form action={submit} className="grid gap-2 rounded-md border bg-surface p-3 md:grid-cols-[180px_1fr_44px]">
        <select name="scopeType" className="h-10 rounded-md border bg-white px-3 text-sm">
          <option value="DEPARTMENT">Department</option>
          <option value="PRODUCTION_LINE">Production Line</option>
          <option value="USER">User</option>
        </select>
        <Input name="scopeId" placeholder="Department, production line, or user ID" required />
        <Button className="h-10 w-10 px-0" type="submit" disabled={pending}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}

