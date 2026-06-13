CREATE INDEX IF NOT EXISTS idx_recipe_categories_active_name
  ON recipe_categories ("isActive", name);

CREATE INDEX IF NOT EXISTS idx_recipes_status_updated
  ON recipes (status, "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_recipes_category_status
  ON recipes ("categoryId", status);

CREATE INDEX IF NOT EXISTS idx_recipes_code_lookup
  ON recipes (code);

CREATE INDEX IF NOT EXISTS idx_recipes_name_ar_search
  ON recipes ("nameAr");

CREATE INDEX IF NOT EXISTS idx_recipes_name_en_search
  ON recipes ("nameEn");

CREATE INDEX IF NOT EXISTS idx_recipe_assignments_recipe_scope
  ON recipe_assignments ("recipeId", "scopeType", "scopeId");

CREATE INDEX IF NOT EXISTS idx_recipe_versions_recipe_version_desc
  ON recipe_versions ("recipeId", "versionNumber" DESC);

CREATE INDEX IF NOT EXISTS idx_recipe_audit_logs_recipe_timestamp_desc
  ON recipe_audit_logs ("recipeId", timestamp DESC);

