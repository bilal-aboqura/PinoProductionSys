export type UserSummary = {
  id: string;
  username: string;
  email: string | null;
  displayName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  languagePreference: string;
  role: { id: string; name: string; displayName: string } | null;
  scopes: {
    departments: { id: string; name: string }[];
    recipeCategories: { id: string; name: string }[];
    productionLines: { id: string; name: string }[];
    inventoryAreas: { id: string; name: string }[];
  };
  createdAt: string;
  lastLoginAt: string | null;
};

export type CreateUserInput = {
  displayName: string;
  username: string;
  email?: string;
  roleId: string;
  departmentIds?: string[];
  recipeCategoryIds?: string[];
  productionLineIds?: string[];
  inventoryAreaIds?: string[];
};

export type UpdateUserInput = {
  displayName?: string;
  email?: string | null;
};

export type CreateUserResult =
  | { success: true; user: UserSummary; temporaryPassword: string }
  | { success: false; error: "VALIDATION_ERROR" | "USERNAME_TAKEN" | "EMAIL_TAKEN"; details?: string[] };

export type UpdateUserResult =
  | { success: true; user: UserSummary }
  | { success: false; error: "NOT_FOUND" | "VALIDATION_ERROR" | "EMAIL_TAKEN"; details?: string[] };

export type ToggleStatusResult =
  | { success: true; user: UserSummary; newStatus: "active" | "inactive" }
  | { success: false; error: "NOT_FOUND" | "LAST_ADMIN_PROTECTION" };

export type ResetPasswordResult = { success: true; temporaryPassword: string } | { success: false; error: "NOT_FOUND" };

export type AssignRoleResult =
  | { success: true; user: UserSummary }
  | { success: false; error: "NOT_FOUND" | "ROLE_NOT_FOUND" | "LAST_ADMIN_PROTECTION" };
