export type ScopeDimension = "departments" | "recipeCategories" | "productionLines" | "inventoryAreas";

export type ScopeAssignment = {
  departmentIds?: string[];
  recipeCategoryIds?: string[];
  productionLineIds?: string[];
  inventoryAreaIds?: string[];
};

export type AssignScopesResult = { success: true } | { success: false; error: "NOT_FOUND" | "VALIDATION_ERROR" };

export type UserScopes = {
  departments: { id: string; name: string }[];
  recipeCategories: { id: string; name: string }[];
  productionLines: { id: string; name: string }[];
  inventoryAreas: { id: string; name: string }[];
};
