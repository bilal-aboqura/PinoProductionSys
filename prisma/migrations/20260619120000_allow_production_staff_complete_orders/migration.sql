INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."code" = 'production-orders:complete'
WHERE r."name" = 'production_staff'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
