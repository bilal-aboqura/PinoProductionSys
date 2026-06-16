import { describe, expect, it } from "vitest";
import { notificationThresholdsSchema, qrConfigSchema, storageConditionSchema } from "../validation";

describe("settings validation", () => {
  it("accepts threshold boundaries used by inventory alerts", () => {
    const result = notificationThresholdsSchema.safeParse({
      lowStockThresholdPercent: 15,
      nearExpiryThresholdDays: 7,
      productionDelayThresholdMinutes: 30
    });

    expect(result.success).toBe(true);
  });

  it("rejects impossible low stock threshold percentages", () => {
    expect(notificationThresholdsSchema.safeParse({ lowStockThresholdPercent: 101, nearExpiryThresholdDays: 7, productionDelayThresholdMinutes: 30 }).success).toBe(false);
  });

  it("validates QR sizes within printable bounds", () => {
    expect(qrConfigSchema.safeParse({ qrEnabled: true, qrSize: 150, errorCorrectionLevel: "M" }).success).toBe(true);
    expect(qrConfigSchema.safeParse({ qrEnabled: true, qrSize: 32, errorCorrectionLevel: "M" }).success).toBe(false);
  });

  it("requires storage condition min temperature to be below max temperature", () => {
    expect(storageConditionSchema.safeParse({ nameEn: "Cold", nameAr: "Cold", minTemperature: 5, maxTemperature: 0 }).success).toBe(false);
  });
});
