"use client";

import Link from "next/link";
import { Save } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveSystemSetting } from "@/features/settings/actions";
import type { SystemSettingDto } from "@/features/settings/types";

function findValue(settings: SystemSettingDto[], key: SystemSettingDto["key"]) {
  return settings.find((setting) => setting.key === key)?.value as Record<string, unknown> | undefined;
}

export function SettingsPreferencesForm({ locale, settings, canManage }: { locale: string; settings: SystemSettingDto[]; canManage: boolean }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const general = findValue(settings, "general_preferences") ?? {};
  const qr = findValue(settings, "qr_config") ?? {};
  const thresholds = findValue(settings, "notification_thresholds") ?? {};

  return (
    <section className="logical-container space-y-6 py-8">
      <div>
        <p className="text-sm font-semibold text-secondary">Administration</p>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Departments", "departments"],
          ["Production Lines", "production-lines"],
          ["Warehouses", "warehouses"],
          ["Recipe Categories", "categories"],
          ["Storage Conditions", "conditions"],
          ["Waste Reasons", "waste-reasons"],
          ["Audit Log", "audit"]
        ].map(([label, href]) => (
          <Link key={href} className="rounded-md border bg-white px-4 py-3 text-sm font-semibold text-secondary hover:bg-accent/35" href={`/${locale}/admin/settings/${href}`}>
            {label}
          </Link>
        ))}
      </div>
      <form
        className="grid gap-4 rounded-md border bg-white p-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canManage) return;
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            const results = await Promise.all([
              saveSystemSetting("general_preferences", {
                companyName: formData.get("companyName"),
                companyLogoUrl: formData.get("companyLogoUrl"),
                timeZone: formData.get("timeZone"),
                dateFormat: formData.get("dateFormat"),
                defaultLanguage: formData.get("defaultLanguage")
              }),
              saveSystemSetting("qr_config", {
                qrEnabled: formData.get("qrEnabled") === "true",
                qrSize: formData.get("qrSize"),
                errorCorrectionLevel: formData.get("errorCorrectionLevel")
              }),
              saveSystemSetting("notification_thresholds", {
                lowStockThresholdPercent: formData.get("lowStockThresholdPercent"),
                nearExpiryThresholdDays: formData.get("nearExpiryThresholdDays"),
                productionDelayThresholdMinutes: formData.get("productionDelayThresholdMinutes")
              })
            ]);
            const failed = results.find((result) => !result.success);
            setMessage(failed?.error ?? "Settings saved.");
          });
        }}
      >
        <h2 className="md:col-span-2 font-bold">Operational Preferences</h2>
        <input className="rounded-md border px-3 py-2 text-sm" name="companyName" defaultValue={String(general.companyName ?? "")} placeholder="Company name" disabled={!canManage} required />
        <input className="rounded-md border px-3 py-2 text-sm" name="companyLogoUrl" defaultValue={String(general.companyLogoUrl ?? "")} placeholder="Logo URL" disabled={!canManage} />
        <input className="rounded-md border px-3 py-2 text-sm" name="timeZone" defaultValue={String(general.timeZone ?? "Africa/Cairo")} placeholder="Time zone" disabled={!canManage} required />
        <select className="rounded-md border px-3 py-2 text-sm" name="dateFormat" defaultValue={String(general.dateFormat ?? "YYYY-MM-DD")} disabled={!canManage}>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
        </select>
        <select className="rounded-md border px-3 py-2 text-sm" name="defaultLanguage" defaultValue={String(general.defaultLanguage ?? "ar")} disabled={!canManage}>
          <option value="ar">Arabic</option>
          <option value="en">English</option>
        </select>
        <select className="rounded-md border px-3 py-2 text-sm" name="qrEnabled" defaultValue={String(qr.qrEnabled ?? true)} disabled={!canManage}>
          <option value="true">QR enabled</option>
          <option value="false">QR disabled</option>
        </select>
        <input className="rounded-md border px-3 py-2 text-sm" name="qrSize" defaultValue={String(qr.qrSize ?? 150)} placeholder="QR size" type="number" min="64" max="512" disabled={!canManage} />
        <select className="rounded-md border px-3 py-2 text-sm" name="errorCorrectionLevel" defaultValue={String(qr.errorCorrectionLevel ?? "M")} disabled={!canManage}>
          <option value="L">Low</option>
          <option value="M">Medium</option>
          <option value="Q">Quartile</option>
          <option value="H">High</option>
        </select>
        <input className="rounded-md border px-3 py-2 text-sm" name="lowStockThresholdPercent" defaultValue={String(thresholds.lowStockThresholdPercent ?? 10)} placeholder="Low stock threshold %" type="number" min="0" max="100" disabled={!canManage} />
        <input className="rounded-md border px-3 py-2 text-sm" name="nearExpiryThresholdDays" defaultValue={String(thresholds.nearExpiryThresholdDays ?? 7)} placeholder="Near expiry days" type="number" min="1" disabled={!canManage} />
        <input className="rounded-md border px-3 py-2 text-sm" name="productionDelayThresholdMinutes" defaultValue={String(thresholds.productionDelayThresholdMinutes ?? 30)} placeholder="Production delay minutes" type="number" min="1" disabled={!canManage} />
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <Button type="submit" disabled={!canManage || isPending}>
            <Save className="h-4 w-4" />
            Save Preferences
          </Button>
          {message ? <p className="text-sm font-semibold text-secondary">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
