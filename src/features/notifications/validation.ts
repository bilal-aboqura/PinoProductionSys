import { z } from "zod";

export const alertRuleUpdateSchema = z.object({
  parameters: z.record(z.string(), z.unknown()),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
  isEnabled: z.boolean()
});

export const notificationPreferenceSchema = z.object({
  inventoryAlerts: z.boolean(),
  batchAlerts: z.boolean(),
  productionAlerts: z.boolean(),
  systemAlerts: z.boolean()
});

export function parseRuleParameters(value: string) {
  try {
    const parsed = JSON.parse(value || "{}") as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
