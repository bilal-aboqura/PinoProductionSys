DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM (
    'USER_CREATED',
    'USER_UPDATED',
    'USER_ACTIVATED',
    'USER_DEACTIVATED',
    'ROLE_ASSIGNED',
    'ROLE_REMOVED',
    'SCOPE_ASSIGNED',
    'SCOPE_REMOVED',
    'PERMISSION_CHANGED',
    'PASSWORD_RESET',
    'PASSWORD_CHANGED',
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGOUT',
    'RECIPE_CREATED',
    'DRAFT_SAVED',
    'PUBLISHED',
    'ARCHIVED',
    'RESTORED',
    'INGREDIENT_ADDED',
    'INGREDIENT_UPDATED',
    'INGREDIENT_REMOVED',
    'STEP_ADDED',
    'STEP_UPDATED',
    'STEP_REMOVED',
    'CATEGORY_CREATED',
    'CATEGORY_CHANGED',
    'CATEGORY_ARCHIVED',
    'RECIPE_SCOPE_ASSIGNED',
    'RECIPE_SCOPE_REMOVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StorageMethod" AS ENUM ('REFRIGERATOR', 'FREEZER', 'ROOM_TEMPERATURE', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "YieldUnit" AS ENUM ('KG', 'GRAM', 'LITER', 'MILLILITER', 'PIECE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ShelfLifeUnit" AS ENUM ('HOURS', 'DAYS', 'WEEKS', 'MONTHS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ScopeType" AS ENUM ('DEPARTMENT', 'PRODUCTION_LINE', 'USER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT,
  "displayName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "languagePreference" TEXT NOT NULL DEFAULT 'ar',
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "permissions" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_roles" (
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedBy" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "departments" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_departments" (
  "userId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "production_lines" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "production_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_production_lines" (
  "userId" TEXT NOT NULL,
  "productionLineId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "recipe_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL DEFAULT '',
  "nameEn" TEXT NOT NULL DEFAULT '',
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recipe_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_recipe_categories" (
  "userId" TEXT NOT NULL,
  "recipeCategoryId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "recipes" (
  "id" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL DEFAULT '',
  "code" TEXT NOT NULL,
  "categoryId" TEXT,
  "description" TEXT,
  "status" "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
  "yieldQuantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "yieldUnit" "YieldUnit" NOT NULL DEFAULT 'KG',
  "shelfLifeValue" INTEGER NOT NULL DEFAULT 0,
  "shelfLifeUnit" "ShelfLifeUnit" NOT NULL DEFAULT 'DAYS',
  "storageMethod" "StorageMethod" NOT NULL DEFAULT 'ROOM_TEMPERATURE',
  "storageNotes" TEXT,
  "productionNotes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0,
  "publishedVersion" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "publishedById" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "purpose" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recipe_steps" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "stepNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "estimatedMinutes" INTEGER,
  "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
  "requiresNotes" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recipe_versions" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "publishedById" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recipe_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recipe_assignments" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "scopeType" "ScopeType" NOT NULL,
  "scopeId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recipe_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recipe_audit_logs" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "actorId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "prevValue" JSONB,
  "newValue" JSONB,
  CONSTRAINT "recipe_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "targetId" TEXT,
  "targetName" TEXT,
  "action" "AuditAction" NOT NULL,
  "previousValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_key" ON "roles"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_code_key" ON "permissions"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "departments_name_key" ON "departments"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "production_lines_name_key" ON "production_lines"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "recipe_categories_name_key" ON "recipe_categories"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "recipes_code_key" ON "recipes"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "recipe_steps_recipeId_stepNumber_key" ON "recipe_steps"("recipeId", "stepNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "recipe_versions_recipeId_versionNumber_key" ON "recipe_versions"("recipeId", "versionNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "recipe_assignments_recipeId_scopeType_scopeId_key" ON "recipe_assignments"("recipeId", "scopeType", "scopeId");

CREATE INDEX IF NOT EXISTS "recipes_status_idx" ON "recipes"("status");
CREATE INDEX IF NOT EXISTS "recipes_categoryId_idx" ON "recipes"("categoryId");
CREATE INDEX IF NOT EXISTS "recipes_code_idx" ON "recipes"("code");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipeId_sortOrder_idx" ON "recipe_ingredients"("recipeId", "sortOrder");
CREATE INDEX IF NOT EXISTS "recipe_steps_recipeId_stepNumber_idx" ON "recipe_steps"("recipeId", "stepNumber");
CREATE INDEX IF NOT EXISTS "recipe_versions_recipeId_versionNumber_idx" ON "recipe_versions"("recipeId", "versionNumber");
CREATE INDEX IF NOT EXISTS "recipe_assignments_scopeType_scopeId_idx" ON "recipe_assignments"("scopeType", "scopeId");
CREATE INDEX IF NOT EXISTS "recipe_audit_logs_recipeId_timestamp_idx" ON "recipe_audit_logs"("recipeId", "timestamp");

DO $$ BEGIN
  ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId", "roleId");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_pkey" PRIMARY KEY ("userId", "departmentId");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_production_lines" ADD CONSTRAINT "user_production_lines_pkey" PRIMARY KEY ("userId", "productionLineId");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_recipe_categories" ADD CONSTRAINT "user_recipe_categories_pkey" PRIMARY KEY ("userId", "recipeCategoryId");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_production_lines" ADD CONSTRAINT "user_production_lines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_production_lines" ADD CONSTRAINT "user_production_lines_productionLineId_fkey" FOREIGN KEY ("productionLineId") REFERENCES "production_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_recipe_categories" ADD CONSTRAINT "user_recipe_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_recipe_categories" ADD CONSTRAINT "user_recipe_categories_recipeCategoryId_fkey" FOREIGN KEY ("recipeCategoryId") REFERENCES "recipe_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "recipes" ADD CONSTRAINT "recipes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "recipe_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_assignments" ADD CONSTRAINT "recipe_assignments_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_audit_logs" ADD CONSTRAINT "recipe_audit_logs_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
