ALTER TABLE "recipes"
  ALTER COLUMN "currencyCode" SET DEFAULT 'SAR';

ALTER TABLE "recipe_versions"
  ALTER COLUMN "calculationCurrency" SET DEFAULT 'SAR';

UPDATE "recipes"
SET "currencyCode" = 'SAR'
WHERE "currencyCode" = 'EGP';

UPDATE "recipe_versions"
SET "calculationCurrency" = 'SAR'
WHERE "calculationCurrency" = 'EGP';
