# Server Action Contracts: User Authentication & Role Management

**Branch**: `001-user-auth-roles` | **Date**: 2026-06-12

All mutations are implemented as Next.js Server Actions (`"use server"`).
Every action validates the caller's session and permissions server-side before execution.
Actions return a typed discriminated union: `{ success: true, data: T } | { success: false, error: string }`.

---

## Auth Actions — `src/features/auth/actions.ts`

### `login(credentials)`

```typescript
type LoginInput = {
  identifier: string   // username OR email (auto-detected)
  password:   string
}

type LoginResult =
  | { success: true;  redirectTo: '/change-password' | '/dashboard' }
  | { success: false; error: 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE' }
```

**Behavior**:
1. Look up user by `username` OR `email` (case-insensitive)
2. Verify bcrypt hash
3. If user `!isActive` → return `ACCOUNT_INACTIVE`
4. Create Auth.js session with role + permissions embedded
5. If `mustChangePassword` → redirect to `/change-password`
6. Log `LOGIN_SUCCESS` audit event

---

### `logout()`

```typescript
type LogoutResult = { success: true }
```

**Behavior**: Destroys Auth.js session, logs `LOGOUT` audit event.

---

### `changePassword(input)`

```typescript
type ChangePasswordInput = {
  currentPassword: string
  newPassword:     string   // min 8 chars, 1 uppercase, 1 number
  confirmPassword: string
}

type ChangePasswordResult =
  | { success: true }
  | { success: false; error: 'WRONG_CURRENT_PASSWORD' | 'VALIDATION_ERROR'; details?: string[] }
```

**Behavior**:
1. Requires authenticated session
2. Verifies `currentPassword` against stored hash
3. Validates `newPassword` meets strength requirements (via Zod)
4. Hashes and saves new password; clears `mustChangePassword`
5. Logs `PASSWORD_CHANGED` audit event

---

## User Management Actions — `src/features/users/actions.ts`

### `createUser(input)`

**Required permission**: `users:create`

```typescript
type CreateUserInput = {
  displayName:        string    // 2–100 chars
  username:           string    // 3–30 chars, alphanumeric + dots/underscores
  email?:             string    // optional, valid email
  roleId:             string
  departmentIds?:     string[]
  recipeCategoryIds?: string[]
  productionLineIds?: string[]
  inventoryAreaIds?:  string[]
}

type CreateUserResult =
  | { success: true;  user: UserSummary; temporaryPassword: string }
  | { success: false; error: 'VALIDATION_ERROR' | 'USERNAME_TAKEN' | 'EMAIL_TAKEN'; details?: string[] }
```

**Behavior**:
1. Validate input with Zod
2. Check username uniqueness (case-insensitive)
3. Check email uniqueness if provided
4. Generate cryptographically random 12-char temporary password
5. Hash password with bcrypt (cost 12)
6. Create `User` record with `mustChangePassword: true`
7. Create `UserRole` record
8. Create scope assignment records
9. Log `USER_CREATED` audit event
10. Return user + temporary password (plaintext, shown once)

---

### `updateUser(id, input)`

**Required permission**: `users:edit`

```typescript
type UpdateUserInput = {
  displayName?: string
  email?:       string | null
}

type UpdateUserResult =
  | { success: true;  user: UserSummary }
  | { success: false; error: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'EMAIL_TAKEN'; details?: string[] }
```

---

### `toggleUserStatus(id)`

**Required permission**: `users:toggle_status`

```typescript
type ToggleStatusResult =
  | { success: true;  user: UserSummary; newStatus: 'active' | 'inactive' }
  | { success: false; error: 'NOT_FOUND' | 'LAST_ADMIN_PROTECTION' }
```

**Behavior**:
- If deactivating: check that at least one other active Administrator exists
- If last active Administrator → return `LAST_ADMIN_PROTECTION` error
- Log `USER_ACTIVATED` or `USER_DEACTIVATED` audit event
- Invalidate all active sessions for the deactivated user

---

### `resetUserPassword(id)`

**Required permission**: `users:edit`

```typescript
type ResetPasswordResult =
  | { success: true;  temporaryPassword: string }
  | { success: false; error: 'NOT_FOUND' }
```

**Behavior**:
1. Generate new cryptographically random 12-char temporary password
2. Hash and save; set `mustChangePassword: true`
3. Invalidate all active sessions for the user
4. Log `PASSWORD_RESET` audit event (does NOT log plaintext password)
5. Return temporary password (shown once to Admin)

---

### `assignUserRole(userId, roleId)`

**Required permission**: `roles:manage`

```typescript
type AssignRoleResult =
  | { success: true;  user: UserSummary }
  | { success: false; error: 'NOT_FOUND' | 'ROLE_NOT_FOUND' | 'LAST_ADMIN_PROTECTION' }
```

**Behavior**:
- Removes existing `UserRole` record, creates new one
- If removing last active Administrator's admin role → `LAST_ADMIN_PROTECTION`
- Invalidates user's session (forces re-login with new permissions)
- Logs `ROLE_ASSIGNED` + `ROLE_REMOVED` audit events

---

### `assignUserScopes(userId, scopes)`

**Required permission**: `users:edit`

```typescript
type ScopeAssignment = {
  departmentIds?:     string[]
  recipeCategoryIds?: string[]
  productionLineIds?: string[]
  inventoryAreaIds?:  string[]
}

type AssignScopesResult =
  | { success: true;  user: UserSummary }
  | { success: false; error: 'NOT_FOUND' | 'VALIDATION_ERROR' }
```

**Behavior**:
- Replaces all scope assignments for each provided dimension
- Dimensions not included in the payload are left unchanged
- Logs `SCOPE_ASSIGNED` / `SCOPE_REMOVED` audit events per dimension changed

---

## Audit Actions — `src/features/audit/actions.ts`

### `getAuditLogs(filters)`

**Required permission**: `audit:view`

```typescript
type AuditLogFilters = {
  targetUsername?: string       // filter by affected user
  action?:         AuditAction  // filter by event type
  fromDate?:       Date
  toDate?:         Date
  page?:           number        // default 1
  pageSize?:       number        // default 50, max 100
}

type AuditLogResult = {
  success: true
  data: {
    logs:       AuditLogEntry[]
    total:      number
    page:       number
    totalPages: number
  }
}
```

---

## Shared Types

```typescript
type UserSummary = {
  id:                 string
  username:           string
  email:              string | null
  displayName:        string
  isActive:           boolean
  mustChangePassword: boolean
  languagePreference: string
  role: {
    id:   string
    name: string
    displayName: string
  } | null
  scopes: {
    departments:      { id: string; name: string }[]
    recipeCategories: { id: string; name: string }[]
    productionLines:  { id: string; name: string }[]
    inventoryAreas:   { id: string; name: string }[]
  }
  createdAt:   string  // ISO 8601
  lastLoginAt: string | null
}

type AuditLogEntry = {
  id:            string
  actorName:     string
  targetName:    string | null
  action:        AuditAction
  previousValue: Record<string, unknown> | null
  newValue:      Record<string, unknown> | null
  createdAt:     string  // ISO 8601
}
```
