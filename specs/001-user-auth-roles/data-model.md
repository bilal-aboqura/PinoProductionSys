# Data Model: User Authentication & Role Management

**Branch**: `001-user-auth-roles` | **Date**: 2026-06-12

---

## Entity Relationship Overview

```
users ─────────────────┬─── user_roles ─────── roles
  │                    │                          │
  │                    └─── user_departments      role_permissions ─── permissions
  │                    └─── user_recipe_categories
  │                    └─── user_production_lines
  │                    └─── user_inventory_areas
  │
  └── audit_logs (actor)
  └── audit_logs (target)
  └── sessions (Auth.js managed)
  └── accounts (Auth.js managed)
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // Supabase Transaction Pooler (port 6543) — runtime
  directUrl = env("DIRECT_URL")     // Supabase Direct connection (port 5432) — migrations only
}

// ─── Auth.js required tables ───────────────────────────────────────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ─── Core domain tables ────────────────────────────────────────────────────

model User {
  id                 String    @id @default(cuid())
  username           String    @unique
  email              String?   @unique
  displayName        String
  passwordHash       String
  mustChangePassword Boolean   @default(false)
  isActive           Boolean   @default(true)
  languagePreference String    @default("ar")  // "ar" | "en"
  lastLoginAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  // Auth.js relations
  accounts           Account[]
  sessions           Session[]

  // Role (one active role enforced at app layer via single UserRole record)
  userRoles          UserRole[]

  // Scope assignments
  departments        UserDepartment[]
  recipeCategories   UserRecipeCategory[]
  productionLines    UserProductionLine[]
  inventoryAreas     UserInventoryArea[]

  // Audit
  auditLogsAsActor   AuditLog[] @relation("AuditActor")
  auditLogsAsTarget  AuditLog[] @relation("AuditTarget")

  @@map("users")
}

model Role {
  id          String           @id @default(cuid())
  name        String           @unique  // "administrator" | "supervisor" | "production_staff" | "warehouse_staff"
  displayName String           // "Administrator" | "Supervisor" | etc. (used in UI)
  description String?
  isSystem    Boolean          @default(false)  // system roles cannot be deleted
  createdAt   DateTime         @default(now())

  userRoles       UserRole[]
  rolePermissions RolePermission[]

  @@map("roles")
}

model Permission {
  id          String           @id @default(cuid())
  code        String           @unique  // e.g. "users:create", "production:approve"
  displayName String
  resource    String           // e.g. "users", "production", "inventory"
  action      String           // e.g. "create", "approve", "view"
  description String?

  rolePermissions RolePermission[]

  @@map("permissions")
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model UserRole {
  userId    String
  roleId    String
  assignedAt DateTime @default(now())
  assignedBy String   // userId of the Admin who made the assignment

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_roles")
}

// ─── Scope dimension tables ────────────────────────────────────────────────

model Department {
  id          String           @id @default(cuid())
  name        String           @unique  // e.g. "Bakery", "Pizza", "Kitchen"
  isActive    Boolean          @default(true)
  createdAt   DateTime         @default(now())

  userDepartments UserDepartment[]

  @@map("departments")
}

model UserDepartment {
  userId       String
  departmentId String
  assignedAt   DateTime @default(now())

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  department Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  @@id([userId, departmentId])
  @@map("user_departments")
}

model RecipeCategory {
  id        String   @id @default(cuid())
  name      String   @unique  // e.g. "Dough", "Sauces", "Desserts"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  userRecipeCategories UserRecipeCategory[]

  @@map("recipe_categories")
}

model UserRecipeCategory {
  userId           String
  recipeCategoryId String
  assignedAt       DateTime @default(now())

  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipeCategory RecipeCategory @relation(fields: [recipeCategoryId], references: [id], onDelete: Cascade)

  @@id([userId, recipeCategoryId])
  @@map("user_recipe_categories")
}

model ProductionLine {
  id        String   @id @default(cuid())
  name      String   @unique  // e.g. "Main Kitchen", "Pizza Station"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  userProductionLines UserProductionLine[]

  @@map("production_lines")
}

model UserProductionLine {
  userId           String
  productionLineId String
  assignedAt       DateTime @default(now())

  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  productionLine ProductionLine @relation(fields: [productionLineId], references: [id], onDelete: Cascade)

  @@id([userId, productionLineId])
  @@map("user_production_lines")
}

model InventoryArea {
  id        String   @id @default(cuid())
  name      String   @unique  // e.g. "Main Warehouse", "Branch Warehouse"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  userInventoryAreas UserInventoryArea[]

  @@map("inventory_areas")
}

model UserInventoryArea {
  userId          String
  inventoryAreaId String
  assignedAt      DateTime @default(now())

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  inventoryArea InventoryArea @relation(fields: [inventoryAreaId], references: [id], onDelete: Cascade)

  @@id([userId, inventoryAreaId])
  @@map("user_inventory_areas")
}

// ─── Audit log ─────────────────────────────────────────────────────────────

model AuditLog {
  id            String      @id @default(cuid())
  actorId       String
  actorName     String      // Snapshot of display name at time of action
  targetId      String?
  targetName    String?     // Snapshot of target display name at time of action
  action        AuditAction
  previousValue Json?       // State before the change
  newValue      Json?       // State after the change
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime    @default(now())

  actor  User  @relation("AuditActor", fields: [actorId], references: [id])
  target User? @relation("AuditTarget", fields: [targetId], references: [id])

  @@map("audit_logs")
}

enum AuditAction {
  USER_CREATED
  USER_UPDATED
  USER_ACTIVATED
  USER_DEACTIVATED
  ROLE_ASSIGNED
  ROLE_REMOVED
  SCOPE_ASSIGNED
  SCOPE_REMOVED
  PERMISSION_CHANGED
  PASSWORD_RESET
  PASSWORD_CHANGED
  LOGIN_SUCCESS
  LOGIN_FAILED
  LOGOUT
}
```

---

## Field Validation Rules

### User

| Field | Type | Constraints |
|-------|------|------------|
| `username` | String | 3–30 chars, alphanumeric + dots/underscores, unique, case-insensitive lookup |
| `email` | String? | Optional, valid email format, unique if provided |
| `displayName` | String | 2–100 chars, required |
| `passwordHash` | String | bcrypt hash, never returned to client |
| `mustChangePassword` | Boolean | Set `true` on create and admin reset; cleared after successful change |
| `isActive` | Boolean | Default `true`; system prevents last-admin deactivation |
| `languagePreference` | String | Enum: `"ar"` or `"en"`, default `"ar"` |

### Role

| Field | Constraints |
|-------|------------|
| `name` | Unique slug, system roles: `administrator`, `supervisor`, `production_staff`, `warehouse_staff` |
| `isSystem` | `true` for 4 default roles — prevents deletion |

### AuditLog

| Field | Constraints |
|-------|------------|
| `createdAt` | Set by DB `DEFAULT NOW()` — not settable by application |
| `previousValue` / `newValue` | JSON snapshots; sensitive fields (passwords) MUST be excluded |
| No `UPDATE` / `DELETE` | Enforced at PostgreSQL role level (app DB user has INSERT + SELECT only on this table) |

---

## State Transitions

### User Account Status

```
[Created] ──isActive:true──► [Active]
    │                            │
    │                     Admin deactivates
    │                            │
    │                            ▼
    │                       [Inactive] ──Admin reactivates──► [Active]
    │
    └── mustChangePassword:true → [Forced Password Change] ──► [Active]
```

### Session Lifecycle

```
[Login attempt]
    │
    ├── credentials valid + isActive + !mustChangePassword → [Session created] → Dashboard
    ├── credentials valid + isActive + mustChangePassword  → [Session created] → /change-password (only)
    ├── credentials valid + !isActive                      → Login error (account inactive)
    └── credentials invalid                               → Login error (generic)

[Active session]
    │
    ├── User deactivated by Admin → session invalidated on next request
    ├── Inactivity timeout (8h)  → session expires
    └── Explicit logout           → session destroyed
```

---

## Seeding (Default Data)

```typescript
// prisma/seed.ts — default roles, permissions, and initial admin

const defaultPermissions = [
  { code: 'users:view',           resource: 'users',      action: 'view' },
  { code: 'users:create',         resource: 'users',      action: 'create' },
  { code: 'users:edit',           resource: 'users',      action: 'edit' },
  { code: 'users:delete',         resource: 'users',      action: 'delete' },
  { code: 'users:toggle_status',  resource: 'users',      action: 'toggle_status' },
  { code: 'roles:manage',         resource: 'roles',      action: 'manage' },
  { code: 'audit:view',           resource: 'audit',      action: 'view' },
  { code: 'production:view',      resource: 'production', action: 'view' },
  { code: 'production:execute',   resource: 'production', action: 'execute' },
  { code: 'production:approve',   resource: 'production', action: 'approve' },
  { code: 'production:reject',    resource: 'production', action: 'reject' },
  { code: 'inventory:view',       resource: 'inventory',  action: 'view' },
  { code: 'inventory:manage',     resource: 'inventory',  action: 'manage' },
  { code: 'inventory:approve',    resource: 'inventory',  action: 'approve' },
  { code: 'reports:view',         resource: 'reports',    action: 'view' },
  { code: 'system:configure',     resource: 'system',     action: 'configure' },
]

// Default admin account seeded with:
// username: admin
// email: admin@pino.local
// password: [generated, printed to console during seed]
// mustChangePassword: true
```
