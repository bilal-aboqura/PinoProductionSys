import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemReferenceImportRow } from "../item-reference-excel";

const mocks = vi.hoisted(() => ({
  findItems: vi.fn(),
  findCategories: vi.fn(),
  createItem: vi.fn(),
  createProfile: vi.fn(),
  createAudit: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    inventoryItem: { findMany: mocks.findItems },
    inventoryCategory: { findMany: mocks.findCategories },
    $transaction: mocks.transaction
  }
}));

import { importItemReferenceRows } from "../item-reference-import-service";

describe("item reference import service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findItems.mockResolvedValue([]);
    mocks.findCategories.mockResolvedValue([{ id: "category-1", name: "Ingredients" }]);
    mocks.createItem.mockResolvedValue({
      id: "new-item-1",
      code: "77",
      nameEn: "Test Item",
      nameAr: "صنف اختبار",
      itemType: "RAW_MATERIAL",
      categoryId: "category-1",
      unit: "GRAM"
    });
    mocks.createProfile.mockResolvedValue({ id: "profile-1" });
    mocks.createAudit.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback) => callback({
      inventoryItem: { create: mocks.createItem },
      ingredientReferenceProfile: { create: mocks.createProfile },
      inventoryAuditLog: { create: mocks.createAudit }
    }));
  });

  it("creates a new catalog item and its first reference in one transaction", async () => {
    const row: ItemReferenceImportRow = {
      rowNumber: 2,
      itemCode: "77",
      itemName: "Test Item",
      nameAr: "صنف اختبار",
      itemType: "RAW_MATERIAL",
      categoryName: "Ingredients",
      baseUnit: "GRAM",
      minStockLevel: 0,
      costReferenceQuantity: 100,
      costReferenceUnit: "GRAM",
      costReferenceValue: 25,
      costCurrency: "SAR",
      calorieValue: 112,
      calorieReferenceQuantity: 100,
      calorieReferenceUnit: "GRAM",
      effectiveAt: new Date("2026-06-23T08:00:00.000Z")
    };

    const result = await importItemReferenceRows([row], "user-1");

    expect(result).toEqual({ importedRowCount: 1, createdItemCount: 1, errors: [] });
    expect(mocks.createItem).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ code: "77", categoryId: "category-1", unit: "GRAM" })
    }));
    expect(mocks.createProfile).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ inventoryItemId: "new-item-1", calorieValue: expect.anything() })
    }));
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
