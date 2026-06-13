"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRecipe } from "@/features/recipes/actions";
import type { RecipeCategoryDto } from "@/features/recipes/types";

const schema = z.object({
  nameAr: z.string().min(1, "Arabic name is required."),
  nameEn: z.string().optional(),
  categoryId: z.string().optional(),
  yieldQuantity: z.number().min(0),
  yieldUnit: z.enum(["KG", "GRAM", "LITER", "MILLILITER", "PIECE"]),
  shelfLifeValue: z.number().min(0),
  shelfLifeUnit: z.enum(["HOURS", "DAYS", "WEEKS", "MONTHS"]),
  storageMethod: z.enum(["REFRIGERATOR", "FREEZER", "ROOM_TEMPERATURE", "CUSTOM"])
});

type FormValues = z.infer<typeof schema>;

export function RecipeCreateForm({ categories, locale }: { categories: RecipeCategoryDto[]; locale: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameAr: "",
      nameEn: "",
      categoryId: "",
      yieldQuantity: 0,
      yieldUnit: "KG",
      shelfLifeValue: 0,
      shelfLifeUnit: "DAYS",
      storageMethod: "ROOM_TEMPERATURE"
    }
  });

  function submit(values: FormValues) {
    setMessage(null);
    startTransition(async () => {
      const result = await createRecipe(values);
      if (!result.success) {
        setMessage(result.details?.join(" ") ?? result.error);
        return;
      }
      router.push(`/${locale}/recipes/${result.data.id}`);
    });
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Arabic Name
          <Input {...form.register("nameAr")} />
          {form.formState.errors.nameAr ? <span className="text-sm text-error">{form.formState.errors.nameAr.message}</span> : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          English Name
          <Input {...form.register("nameEn")} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Category
          <select className="h-10 rounded-md border bg-white px-3 text-sm" {...form.register("categoryId")}>
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
          <Input type="number" step="0.001" {...form.register("yieldQuantity", { valueAsNumber: true })} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Yield Unit
          <select className="h-10 rounded-md border bg-white px-3 text-sm" {...form.register("yieldUnit")}>
            {["KG", "GRAM", "LITER", "MILLILITER", "PIECE"].map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Shelf Life
          <Input type="number" {...form.register("shelfLifeValue", { valueAsNumber: true })} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Shelf Unit
          <select className="h-10 rounded-md border bg-white px-3 text-sm" {...form.register("shelfLifeUnit")}>
            {["HOURS", "DAYS", "WEEKS", "MONTHS"].map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Storage Method
          <select className="h-10 rounded-md border bg-white px-3 text-sm" {...form.register("storageMethod")}>
            {["REFRIGERATOR", "FREEZER", "ROOM_TEMPERATURE", "CUSTOM"].map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message ? <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{message}</div> : null}
      <Button type="submit" disabled={pending}>
        Create Draft
      </Button>
    </form>
  );
}

