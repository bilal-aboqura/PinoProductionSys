# Permission Matrix: User Authentication & Role Management

**Branch**: `001-user-auth-roles` | **Date**: 2026-06-12

This matrix defines the complete permission set for v1. Permission codes follow
the `resource:action` convention and are seeded into the `permissions` table.
Role assignments are seeded into `role_permissions`.

---

## Full Permission Matrix

| Permission Code | Display Name | Administrator | Supervisor | Production Staff | Warehouse Staff |
|---|---|:---:|:---:|:---:|:---:|
| **User Management** | | | | | |
| `users:view` | View Users | ✅ | ❌ | ❌ | ❌ |
| `users:create` | Create Users | ✅ | ❌ | ❌ | ❌ |
| `users:edit` | Edit Users | ✅ | ❌ | ❌ | ❌ |
| `users:delete` | Delete Users | ✅ | ❌ | ❌ | ❌ |
| `users:toggle_status` | Activate / Deactivate Users | ✅ | ❌ | ❌ | ❌ |
| **Role & Permission Management** | | | | | |
| `roles:manage` | Manage Roles & Permissions | ✅ | ❌ | ❌ | ❌ |
| **Audit** | | | | | |
| `audit:view` | View Audit Trail | ✅ | ❌ | ❌ | ❌ |
| **Production** | | | | | |
| `production:view` | View Production Orders | ✅ | ✅ | ✅ | ❌ |
| `production:execute` | Execute Production Steps | ✅ | ❌ | ✅ | ❌ |
| `production:approve` | Approve Production Actions | ✅ | ✅ | ❌ | ❌ |
| `production:reject` | Reject Production Actions | ✅ | ✅ | ❌ | ❌ |
| **Inventory** | | | | | |
| `inventory:view` | View Inventory | ✅ | ✅ | ❌ | ✅ |
| `inventory:manage` | Manage Inventory Transactions | ✅ | ❌ | ❌ | ✅ |
| `inventory:approve` | Approve Inventory Actions | ✅ | ✅ | ❌ | ❌ |
| **Reports** | | | | | |
| `reports:view` | View Reports | ✅ | ✅ | ❌ | ❌ |
| **System** | | | | | |
| `system:configure` | System Configuration | ✅ | ❌ | ❌ | ❌ |

---

## Permission Summary Per Role

### Administrator
Full access to all 16 permissions. The only role that can manage users, roles, and system
configuration. Cannot be fully deactivated — at least one active Administrator must always exist.

### Supervisor
7 permissions: view production, approve/reject production, view inventory, approve inventory,
view reports. Read + approval authority only — no create/edit/delete on records.
No user or system administration access.

### Production Staff
3 permissions: view production, execute production steps. Scoped to assigned departments,
recipe categories, and production lines. No inventory or administrative access.

### Warehouse Staff
3 permissions: view inventory, manage inventory transactions. Scoped to assigned inventory areas.
No production or administrative access.

---

## Navigation Visibility Rules

Based on permissions, navigation items are shown/hidden as follows:

| Nav Section | Required Permission | Administrator | Supervisor | Production Staff | Warehouse Staff |
|---|---|:---:|:---:|:---:|:---:|
| Dashboard | (any authenticated) | ✅ | ✅ | ✅ | ✅ |
| Production | `production:view` | ✅ | ✅ | ✅ | ❌ |
| Inventory | `inventory:view` | ✅ | ✅ | ❌ | ✅ |
| Reports | `reports:view` | ✅ | ✅ | ❌ | ❌ |
| Admin → Users | `users:view` | ✅ | ❌ | ❌ | ❌ |
| Admin → Roles | `roles:manage` | ✅ | ❌ | ❌ | ❌ |
| Admin → Audit Log | `audit:view` | ✅ | ❌ | ❌ | ❌ |
| Admin → System | `system:configure` | ✅ | ❌ | ❌ | ❌ |

---

## Scope Dimension Enforcement Rules

Scope restrictions are applied **on top of** role permissions. They never grant additional
permissions — they only narrow what data is visible within already-permitted sections.

| Scope Dimension | Applied To | Enforcement |
|---|---|---|
| Department | Production Staff, Supervisor | Production records filtered to assigned department(s) |
| Recipe Category | Production Staff | Recipe browsing filtered to assigned category(ies) |
| Production Line | Production Staff | Production line records filtered to assigned line(s) |
| Inventory Area | Warehouse Staff, Supervisor | Inventory records filtered to assigned area(s) |

**No scope assigned** = unrestricted within the user's role permissions (full access to all
values in that dimension).

**Multi-value**: A user assigned to Departments `[Bakery, Pizza]` can see all records from
both Bakery and Pizza, but not Kitchen.

---

## Route Protection Rules

All routes under `/(protected)/` require an active authenticated session.
Specific routes additionally require a permission check:

| Route Pattern | Required Permission |
|---|---|
| `/[locale]/(protected)/admin/users` | `users:view` |
| `/[locale]/(protected)/admin/users/new` | `users:create` |
| `/[locale]/(protected)/admin/users/[id]` | `users:view` |
| `/[locale]/(protected)/admin/roles` | `roles:manage` |
| `/[locale]/(protected)/admin/audit` | `audit:view` |
| `/[locale]/(protected)/admin/system` | `system:configure` |
| `/[locale]/(protected)/production/*` | `production:view` |
| `/[locale]/(protected)/inventory/*` | `inventory:view` |
| `/[locale]/(protected)/reports/*` | `reports:view` |

Unauthorized access to any protected route returns HTTP 403 with the localized
Access Denied page — not a redirect to login (which is reserved for unauthenticated requests).
