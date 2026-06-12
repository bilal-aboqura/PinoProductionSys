"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { assignUserScopes } from "@/features/scopes/actions";
import { Button } from "@/components/ui/button";
import type { UserScopes } from "@/features/scopes/types";

type Option = { id: string; name: string };
type Options = Record<keyof UserScopes, Option[]>;

export function ScopeSelector({ userId, initial, options }: { userId: string; initial: UserScopes; options: Options }) {
  const t = useTranslations("scopes");
  const [selected, setSelected] = useState({
    departmentIds: initial.departments.map((item) => item.id),
    recipeCategoryIds: initial.recipeCategories.map((item) => item.id),
    productionLineIds: initial.productionLines.map((item) => item.id),
    inventoryAreaIds: initial.inventoryAreas.map((item) => item.id)
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof typeof selected, id: string) {
    setSelected((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id]
    }));
  }

  function save() {
    startTransition(async () => {
      const result = await assignUserScopes(userId, selected);
      setMessage(result.success ? "Saved" : result.error);
    });
  }

  const groups = [
    ["departments", "departmentIds", options.departments],
    ["recipeCategories", "recipeCategoryIds", options.recipeCategories],
    ["productionLines", "productionLineIds", options.productionLines],
    ["inventoryAreas", "inventoryAreaIds", options.inventoryAreas]
  ] as const;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">{t("title")}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map(([labelKey, stateKey, items]) => (
          <fieldset key={labelKey} className="rounded-lg border bg-white p-4">
            <legend className="px-1 text-sm font-semibold text-secondary">{t(labelKey)}</legend>
            <div className="mt-2 space-y-2">
              {items.length === 0 ? <p className="text-sm text-muted">{t("empty")}</p> : null}
              {items.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected[stateKey].includes(item.id)} onChange={() => toggle(stateKey, item.id)} />
                  {item.name}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {message ? <p className="text-sm font-semibold text-secondary">{message}</p> : null}
      <Button type="button" onClick={save} disabled={pending}>
        {t("assign")}
      </Button>
    </section>
  );
}
