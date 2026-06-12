"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveDraft } from "@/features/recipes/actions";
import type { RecipeCategoryDto, RecipeDetailDto } from "@/features/recipes/types";

const schema = z.object({
  nameAr: z.string().min(1, "Arabic name is required."),
  nameEn: z.string().optional(),
  code: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  yieldQuantity: z.number().min(0),
  yieldUnit: z.enum(["KG", "GRAM", "LITER", "MILLILITER", "PIECE"]),
  shelfLifeValue: z.number().min(0),
  shelfLifeUnit: z.enum(["HOURS", "DAYS", "WEEKS", "MONTHS"]),
  storageMethod: z.enum(["REFRIGERATOR", "FREEZER", "ROOM_TEMPERATURE", "CUSTOM"]),
  storageNotes: z.string().optional(),
  productionNotes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export function RecipeForm({
  recipe,
  categories
}: {
  recipe: RecipeDetailDto;
  categories: RecipeCategoryDto[];
}) {
  const router = useRouter();
  const [version, setVersion] = useState(recipe.version);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameAr: recipe.nameAr,
      nameEn: recipe.nameEn,
      code: recipe.code,
      categoryId: recipe.category?.id ?? "",
      description: recipe.description ?? "",
      yieldQuantity: Number(recipe.yieldQuantity),
      yieldUnit: recipe.yieldUnit,
      shelfLifeValue: recipe.shelfLifeValue,
      shelfLifeUnit: recipe.shelfLifeUnit,
      storageMethod: recipe.storageMethod,
      storageNotes: recipe.storageNotes ?? "",
      productionNotes: recipe.productionNotes ?? ""
    }
  });

  function submit(values: FormValues) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveDraft(recipe.id, values, version);
      if (!result.success) {
        if (result.code === "CONFLICT") setConflict(true);
        setMessage(result.details?.join(" ") ?? result.error);
        return;
      }
      setVersion(result.data.newVersion);
      setMessage("Draft saved.");
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
      {conflict ? (
        <div className="rounded-md border border-warning/40 bg-warning/15 px-4 py-3 text-sm font-semibold text-secondary">
          This recipe was modified by another user. Reload to get the latest version.
          <Button className="ms-3 h-8" type="button" variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Arabic Name / الاسم العربي
          <Input {...form.register("nameAr")} onBlur={form.handleSubmit(submit)} />
          {form.formState.errors.nameAr ? <span className="text-sm text-error">{form.formState.errors.nameAr.message}</span> : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          English Name / الاسم الإنجليزي
          <Input {...form.register("nameEn")} onBlur={form.handleSubmit(submit)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Code
          <Input {...form.register("code")} onBlur={form.handleSubmit(submit)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Category
          <select className="h-10 rounded-md border bg-white px-3 text-sm" {...form.register("categoryId")} onBlur={form.handleSubmit(submit)}>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameEn} / {category.nameAr}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Yield Quantity
          <Input type="number" step="0.001" {...form.register("yieldQuantity", { valueAsNumber: true })} onBlur={form.handleSubmit(submit)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Yield Unit
          <select className="h-10 rounded-md border bg-white px-3 text-sm" {...form.register("yieldUnit")} onBlur={form.handleSubmit(submit)}>
            {["KG", "GRAM", "LITER", "MILLILITER", "PIECE"].map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Shelf Life
          <Input type="number" {...form.register("shelfLifeValue", { valueAsNumber: true })} onBlur={form.handleSubmit(submit)} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Shelf Unit
          <select className="h-10 rounded-md border bg-white px-3 text-sm" {...form.register("shelfLifeUnit")} onBlur={form.handleSubmit(submit)}>
            {["HOURS", "DAYS", "WEEKS", "MONTHS"].map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Storage Method
          <select className="h-10 rounded-md border bg-white px-3 text-sm" {...form.register("storageMethod")} onBlur={form.handleSubmit(submit)}>
            {["REFRIGERATOR", "FREEZER", "ROOM_TEMPERATURE", "CUSTOM"].map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Storage Notes
          <Input {...form.register("storageNotes")} onBlur={form.handleSubmit(submit)} />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        Description
        <textarea className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" {...form.register("description")} onBlur={form.handleSubmit(submit)} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Production Notes
        <textarea className="min-h-24 rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" {...form.register("productionNotes")} onBlur={form.handleSubmit(submit)} />
      </label>
      {message ? <div className="rounded-md border border-accent bg-accent/30 px-3 py-2 text-sm text-secondary">{message}</div> : null}
      <Button type="submit" disabled={pending}>
        Save Draft
      </Button>
    </form>
  );
}
