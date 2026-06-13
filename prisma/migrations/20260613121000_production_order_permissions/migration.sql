INSERT INTO "permissions" ("id", "code", "displayName", "resource", "action")
VALUES
  (gen_random_uuid()::text, 'production-orders:view', 'View Production Orders', 'production-orders', 'view'),
  (gen_random_uuid()::text, 'production-orders:create', 'Create Production Orders', 'production-orders', 'create'),
  (gen_random_uuid()::text, 'production-orders:assign', 'Assign Production Orders', 'production-orders', 'assign'),
  (gen_random_uuid()::text, 'production-orders:claim', 'Claim Production Orders', 'production-orders', 'claim'),
  (gen_random_uuid()::text, 'production-orders:execute', 'Execute Production Orders', 'production-orders', 'execute'),
  (gen_random_uuid()::text, 'production-orders:complete', 'Complete Production Orders', 'production-orders', 'complete'),
  (gen_random_uuid()::text, 'production-orders:cancel', 'Cancel Production Orders', 'production-orders', 'cancel'),
  (gen_random_uuid()::text, 'production-orders:view_all', 'View All Production Orders', 'production-orders', 'view_all')
ON CONFLICT ("code") DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  "resource" = EXCLUDED."resource",
  "action" = EXCLUDED."action";

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" = 'administrator'
  AND p."code" LIKE 'production-orders:%'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'production-orders:view',
  'production-orders:view_all',
  'production-orders:create',
  'production-orders:assign',
  'production-orders:complete',
  'production-orders:cancel'
)
WHERE r."name" = 'supervisor'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" IN (
  'production-orders:view',
  'production-orders:claim',
  'production-orders:execute'
)
WHERE r."name" = 'production_staff'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
