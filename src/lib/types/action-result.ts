export type ActionErrorCode = "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "ARCHIVE_BLOCKED" | "INTERNAL";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: ActionErrorCode; details?: string[] };

