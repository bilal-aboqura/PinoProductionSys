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
  | "recipes:create"
  | "recipes:edit"
  | "recipes:publish"
  | "recipes:archive"
  | "recipes:view"
  | "recipes:view_versions"
  | "recipes:manage_categories"
  | "recipes:manage_scope"
  | "reports:view"
  | "system:configure";

export type PermissionSet = PermissionCode[];

export type RoleWithPermissions = {
  id: string;
  name: string;
  displayName: string;
  permissions: PermissionCode[];
};
