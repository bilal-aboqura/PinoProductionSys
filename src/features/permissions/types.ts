export type PermissionCode =
  | "users:view"
  | "users:create"
  | "users:edit"
  | "users:delete"
  | "users:toggle_status"
  | "roles:manage"
  | "audit:view"
  | "production:view"
  | "production:execute"
  | "production:approve"
  | "production:reject"
  | "inventory:view"
  | "inventory:manage"
  | "inventory:approve"
  | "reports:view"
  | "system:configure";

export type PermissionSet = PermissionCode[];

export type RoleWithPermissions = {
  id: string;
  name: string;
  displayName: string;
  permissions: PermissionCode[];
};
