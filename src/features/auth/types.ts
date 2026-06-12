export type LoginInput = {
  identifier: string;
  password: string;
};

export type LoginResult =
  | { success: true; redirectTo: "/change-password" | "/dashboard" }
  | { success: false; error: "INVALID_CREDENTIALS" | "ACCOUNT_INACTIVE" | "DATABASE_UNAVAILABLE" };

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordResult =
  | { success: true }
  | { success: false; error: "WRONG_CURRENT_PASSWORD" | "VALIDATION_ERROR"; details?: string[] };
