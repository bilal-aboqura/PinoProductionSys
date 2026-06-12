# Data Model: Recipe Management Module

**Branch**: `002-recipe-management` | **Phase**: 1 | **Date**: 2026-06-12

---

## Entity Relationship Overview

```
RecipeCategory ──< Recipe >── RecipeVersion (snapshots)
                      │
                      ├──< RecipeIngredient >── InventoryItem (external)
                      │
                      ├──< RecipeStep
                      │
                      ├──< RecipeAssignment
                      │
                      └──< RecipeAuditLog
```

---

## Prisma Schema

```prisma
// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum RecipeStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum StorageMethod {
  REFRIGERATOR
  FREEZER
  ROOM_TEMPERATURE
  CUSTOM
}

enum YieldUnit {
  KG
  GRAM
  LITER
  MILLILITER
  PIECE
}

enum ShelfLifeUnit {
  HOURS
  DAYS
  WEEKS
  MONTHS
}

enum ScopeType {
  DEPARTMENT
  PRODUCTION_LINE
  USER
}

enum AuditAction {
  CREATED
  DRAFT_SAVED
  PUBLISHED
  ARCHIVED
  RESTORED
  INGREDIENT_ADDED
  INGREDIENT_UPDATED
  INGREDIENT_REMOVED
  STEP_ADDED
  STEP_UPDATED
  STEP_REMOVED
  SCOPE_ASSIGNED
  SCOPE_REMOVED
  CATEGORY_CHANGED
}

// ─────────────────────────────────────────────
// RECIPE CATEGORY
// ─────────────────────────────────────────────

model RecipeCategory {
  id          String   @id @default(cuid())
  nameAr      String
  nameEn      String
  description String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  recipes     Recipe[]

  @@map("recipe_categories")
}

// ─────────────────────────────────────────────
// RECIPE
// ─────────────────────────────────────────────

model Recipe {
  id               String        @id @default(cuid())

  // Bilingual names
  nameAr           String
  nameEn           String
  code             String        @unique

  categoryId       String
  category         RecipeCategory @relation(fields: [categoryId], references: [id])

  description      String?

  // Lifecycle
  status           RecipeStatus  @default(DRAFT)

  // Production Yield
  yieldQuantity    Decimal       @db.Decimal(10, 3)
  yieldUnit        YieldUnit

  // Shelf Life
  shelfLifeValue   Int
  shelfLifeUnit    ShelfLifeUnit

  // Storage
  storageMethod    StorageMethod
  storageNotes     String?

  // Production instructions (rich text / markdown)
  productionNotes  String?

  // Optimistic locking
  version          Int           @default(0)

  // Version tracking
  publishedVersion Int           @default(0)
  publishedAt      DateTime?
  publishedById    String?

  // Audit fields
  createdById      String
  updatedById      String
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  // Relations
  ingredients      RecipeIngredient[]
  steps            RecipeStep[]
  versions         RecipeVersion[]
  assignments      RecipeAssignment[]
  auditLogs        RecipeAuditLog[]

  @@map("recipes")
}

// ─────────────────────────────────────────────
// RECIPE INGREDIENT
// ─────────────────────────────────────────────

model RecipeIngredient {
  id              String   @id @default(cuid())
  recipeId        String
  recipe          Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  // FK to inventory_items (external module — raw ID, no Prisma relation yet)
  inventoryItemId String

  quantity        Decimal  @db.Decimal(10, 3)
  unit            String   // mirrors inventory item's unit of measure

  purpose         String?  // e.g., "Main Dough", "Dusting"
  sortOrder       Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("recipe_ingredients")
}

// ─────────────────────────────────────────────
// RECIPE STEP
// ─────────────────────────────────────────────

model RecipeStep {
  id               String   @id @default(cuid())
  recipeId         String
  recipe           Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  stepNumber       Int
  title            String
  instructions     String
  estimatedMinutes Int?     // nullable — not all steps have a time estimate

  requiresPhoto    Boolean  @default(false)
  requiresNotes    Boolean  @default(false)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@map("recipe_steps")
}

// ─────────────────────────────────────────────
// RECIPE VERSION (immutable snapshot on publish)
// ─────────────────────────────────────────────

model RecipeVersion {
  id              String   @id @default(cuid())
  recipeId        String
  recipe          Recipe   @relation(fields: [recipeId], references: [id])

  versionNumber   Int      // monotonic counter, e.g. 1, 2, 3 → displayed as v1, v2, v3

  // Full JSON snapshot of recipe + ingredients + steps + storage + shelf life at publish time
  snapshot        Json

  publishedById   String
  publishedAt     DateTime @default(now())

  @@unique([recipeId, versionNumber])
  @@map("recipe_versions")
}

// ─────────────────────────────────────────────
// RECIPE ASSIGNMENT (scope)
// ─────────────────────────────────────────────

model RecipeAssignment {
  id         String    @id @default(cuid())
  recipeId   String
  recipe     Recipe    @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  scopeType  ScopeType
  scopeId    String    // department_id, production_line_id, or user_id

  assignedById String
  assignedAt   DateTime @default(now())

  @@unique([recipeId, scopeType, scopeId])
  @@map("recipe_assignments")
}

// ─────────────────────────────────────────────
// RECIPE AUDIT LOG (append-only)
// ─────────────────────────────────────────────

model RecipeAuditLog {
  id        String      @id @default(cuid())
  recipeId  String
  recipe    Recipe      @relation(fields: [recipeId], references: [id])

  action    AuditAction
  actorId   String
  timestamp DateTime    @default(now())

  prevValue Json?       // previous state relevant to action
  newValue  Json?       // new state relevant to action

  @@map("recipe_audit_logs")
}
```

---

## State Machine

```
         ┌─────────────────────────────────────┐
         │                                     │
    [Create]                              [Restore]
         │                                     │
         ▼                                     │
      DRAFT ──[Publish]──► ACTIVE ──[Archive]──► ARCHIVED
         ▲                   │
         │                   │ (edit → re-draft allowed
      [Edit]              [Edit → re-save as DRAFT,
         │                   │  then re-Publish)
         └───────────────────┘
```

**Rules**:
- `DRAFT → ACTIVE`: via explicit Publish action only. Requires name_ar, name_en, code, category, ≥1 ingredient, ≥1 step.
- `ACTIVE → ARCHIVED`: Admin action. Warns if in-progress production orders exist.
- `ARCHIVED → ACTIVE`: Admin Restore action. Re-adds to production order selector.
- Editing an ACTIVE recipe reverts it to DRAFT (implicit). A new Publish creates the next version.
- No direct `DRAFT → ARCHIVED` transition (delete a draft instead).

---

## Snapshot Schema (recipe_versions.snapshot — JSONB)

```json
{
  "recipeId": "cuid...",
  "versionNumber": 3,
  "nameAr": "عجينة البيتزا",
  "nameEn": "Pizza Dough",
  "code": "RCP-001",
  "categoryId": "cuid...",
  "categoryNameAr": "عجين",
  "categoryNameEn": "Dough",
  "description": "Standard pizza dough for 30cm base",
  "yieldQuantity": "10.000",
  "yieldUnit": "KG",
  "shelfLifeValue": 2,
  "shelfLifeUnit": "DAYS",
  "storageMethod": "REFRIGERATOR",
  "storageNotes": "Keep below 4°C",
  "productionNotes": "...",
  "ingredients": [
    {
      "id": "cuid...",
      "inventoryItemId": "cuid...",
      "inventoryItemNameAr": "دقيق",
      "inventoryItemNameEn": "Flour",
      "quantity": "10.000",
      "unit": "KG",
      "purpose": "Main Dough",
      "sortOrder": 1
    }
  ],
  "steps": [
    {
      "id": "cuid...",
      "stepNumber": 1,
      "title": "Prepare Flour",
      "instructions": "Sift flour into mixing bowl...",
      "estimatedMinutes": 5,
      "requiresPhoto": false,
      "requiresNotes": false
    }
  ],
  "publishedAt": "2026-06-12T15:00:00Z",
  "publishedById": "user_cuid..."
}
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| `nameAr` | Required at publish. Min 2 chars. Max 200 chars. |
| `nameEn` | Required at publish. Min 2 chars. Max 200 chars. |
| `code` | Required always. Unique. Pattern: `RCP-\d{3,6}` or auto-generated. |
| `categoryId` | Required at publish. Must reference active category. |
| `yieldQuantity` | Required at publish. Must be > 0. Max 999,999.999. |
| `yieldUnit` | Required at publish. Must be valid enum value. |
| `shelfLifeValue` | Required at publish. Must be > 0. Integer. |
| `shelfLifeUnit` | Required at publish. Must be valid enum value. |
| `storageMethod` | Required at publish. |
| `storageNotes` | Required when `storageMethod = CUSTOM`. |
| `ingredients` | Min 1 at publish. Each must have valid `inventoryItemId`, `quantity > 0`, `unit`. |
| `steps` | Min 1 at publish. Each must have `stepNumber`, `title`, `instructions`. `stepNumber` must be unique within recipe. |
| `version` | Optimistic lock — must match DB `version` on save/publish. |

---

## Indexes

```sql
-- Recipe list performance
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipes_category ON recipes(category_id);
CREATE INDEX idx_recipes_code ON recipes(code);

-- Bilingual search
CREATE INDEX idx_recipes_name_ar ON recipes USING gin(to_tsvector('simple', name_ar));
CREATE INDEX idx_recipes_name_en ON recipes USING gin(to_tsvector('simple', name_en));

-- Version lookup by recipe
CREATE INDEX idx_recipe_versions_recipe ON recipe_versions(recipe_id, version_number DESC);

-- Audit log by recipe (time-ordered)
CREATE INDEX idx_audit_logs_recipe ON recipe_audit_logs(recipe_id, timestamp DESC);

-- Scope enforcement
CREATE INDEX idx_assignments_scope ON recipe_assignments(scope_type, scope_id);
```
