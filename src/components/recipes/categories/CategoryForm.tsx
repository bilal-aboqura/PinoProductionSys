"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRecipeCategory, updateRecipeCategory } from "@/features/recipes/actions";
import type { RecipeCategoryDto } from "@/features/recipes/types";

const schema = z.object({
  nameAr: z.string().min(2, "Arabic name is required."),
  nameEn: z.string().min(2, "English name is required."),
  description: z.string().optional(),
  sortOrder: z.number().min(0)
});

type FormValues = z.infer<typeof schema>;

export function CategoryForm({ category, locale }: { category?: RecipeCategoryDto; locale: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameAr: category?.nameAr ?? "",
      nameEn: category?.nameEn ?? "",
      description: category?.description ?? "",
      sortOrder: category?.sortOrder ?? 0
    }
  });

  function onSubmit(values: FormValues) {
    setMessage(null);
    startTransition(async () => {
      const result = category ? await updateRecipeCategory(category.id, values) : await createRecipeCategory(values);
      if (!result.success) {
        setMessage(result.details?.join(" ") ?? result.error);
        return;
      }
      router.push(`/${locale}/recipes/categories`);
      router.refresh();
    });
  }

  return (
    <form className="grid max-w-3xl gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-2 text-sm font-semibold">
        Arabic Name
        <Input {...form.register("nameAr")} />
        {form.formState.errors.nameAr ? <span className="text-sm text-error">{form.formState.errors.nameAr.message}</span> : null}
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        English Name
        <Input {...form.register("nameEn")} />
        {form.formState.errors.nameEn ? <span className="text-sm text-error">{form.formState.errors.nameEn.message}</span> : null}
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Description
        <textarea className="min-h-24 rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" {...form.register("description")} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Sort Order
        <Input type="number" min={0} {...form.register("sortOrder", { valueAsNumber: true })} />
      </label>
      {message ? <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{message}</div> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Save Category
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/${locale}/recipes/categories`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
