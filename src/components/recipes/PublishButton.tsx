"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publishRecipe } from "@/features/recipes/actions";

export function PublishButton({ recipeId, version }: { recipeId: string; version: number }) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {conflict ? (
        <div className="rounded-md border border-warning/40 bg-warning/15 px-3 py-2 text-sm text-secondary">
          This recipe was modified by another user. Reload to get the latest version.
          <Button className="ms-3 h-8" type="button" variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      ) : null}
      {errors.length > 0 ? (
        <ul className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      <Button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          setErrors([]);
          setConflict(false);
          const result = await publishRecipe(recipeId, version);
          if (!result.success) {
            if (result.code === "VALIDATION") setErrors(result.details ?? [result.error]);
            if (result.code === "CONFLICT") setConflict(true);
            return;
          }
          router.refresh();
        })}
      >
        <Send className="h-4 w-4" />
        Publish
      </Button>
    </div>
  );
}

