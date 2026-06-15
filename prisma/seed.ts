import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const permissions = [
  ["users:view", "View Users", "users", "view"],
  ["users:create", "Create Users", "users", "create"],
  ["users:edit", "Edit Users", "users", "edit"],
  ["users:delete", "Delete Users", "users", "delete"],
  ["users:toggle_status", "Activate / Deactivate Users", "users", "toggle_status"],
  ["roles:manage", "Manage Roles & Permissions", "roles", "manage"],
  ["audit:view", "View Audit Trail", "audit", "view"],
  ["production:view", "View Production Orders", "production", "view"],
  ["production:execute", "Execute Production Steps", "production", "execute"],
  ["production:approve", "Approve Production Actions", "production", "approve"],
  ["production:reject", "Reject Production Actions", "production", "reject"],
  ["production-orders:view", "View Production Orders", "production-orders", "view"],
  ["production-orders:create", "Create Production Orders", "production-orders", "create"],
  ["production-orders:assign", "Assign Production Orders", "production-orders", "assign"],
  ["production-orders:claim", "Claim Production Orders", "production-orders", "claim"],
  ["production-orders:execute", "Execute Production Orders", "production-orders", "execute"],
  ["production-orders:complete", "Complete Production Orders", "production-orders", "complete"],
  ["production-orders:cancel", "Cancel Production Orders", "production-orders", "cancel"],
  ["production-orders:view_all", "View All Production Orders", "production-orders", "view_all"],
  ["inventory:view", "View Inventory", "inventory", "view"],
  ["inventory:manage", "Manage Inventory Transactions", "inventory", "manage"],
  ["inventory:adjust", "Adjust Inventory", "inventory", "adjust"],
  ["inventory:transfer", "Transfer Inventory", "inventory", "transfer"],
  ["inventory:approve", "Approve Inventory Actions", "inventory", "approve"],
  ["recipes:create", "Create Recipes", "recipes", "create"],
  ["recipes:edit", "Edit Recipes", "recipes", "edit"],
  ["recipes:publish", "Publish Recipes", "recipes", "publish"],
  ["recipes:archive", "Archive Recipes", "recipes", "archive"],
  ["recipes:view", "View Recipes", "recipes", "view"],
  ["recipes:view_versions", "View Recipe Version History", "recipes", "view_versions"],
  ["recipes:manage_categories", "Manage Recipe Categories", "recipes", "manage_categories"],
  ["recipes:manage_scope", "Manage Recipe Scope", "recipes", "manage_scope"],
  ["reports:view", "View Reports", "reports", "view"],
  ["system:configure", "System Configuration", "system", "configure"]
] as const;

const rolePermissions: Record<string, string[]> = {
  administrator: permissions.map(([code]) => code),
  supervisor: [
    "production:view",
    "production:approve",
    "production:reject",
    "production-orders:view",
    "production-orders:view_all",
    "production-orders:create",
    "production-orders:assign",
    "production-orders:complete",
    "production-orders:cancel",
    "inventory:view",
    "inventory:approve",
    "inventory:adjust",
    "inventory:transfer",
    "recipes:create",
    "recipes:edit",
    "recipes:publish",
    "recipes:view",
    "recipes:view_versions",
    "reports:view"
  ],
  production_staff: [
    "production:view",
    "production:execute",
    "production-orders:view",
    "production-orders:claim",
    "production-orders:execute",
    "recipes:view"
  ],
  warehouse_staff: ["inventory:view", "inventory:manage", "inventory:adjust", "inventory:transfer", "recipes:view"]
};

const roleLabels: Record<string, string> = {
  administrator: "Administrator",
  supervisor: "Supervisor",
  production_staff: "Production Staff",
  warehouse_staff: "Warehouse Staff"
};

function tempPassword() {
  return randomBytes(9).toString("base64url").slice(0, 12);
}

async function main() {
  for (const [code, displayName, resource, action] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { displayName, resource, action },
      create: { code, displayName, resource, action }
    });
  }

  for (const [name, displayName] of Object.entries(roleLabels)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { displayName, isSystem: true },
      create: { name, displayName, isSystem: true }
    });

    for (const code of rolePermissions[name] ?? []) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id }
      });
    }
  }

  for (const name of ["Bakery", "Pizza", "Kitchen"]) {
    await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of ["Dough", "Sauces", "Desserts"]) {
    await prisma.recipeCategory.upsert({
      where: { name },
      update: { nameAr: name, nameEn: name },
      create: { name, nameAr: name, nameEn: name }
    });
  }
  for (const name of ["Main Kitchen", "Pizza Station"]) {
    await prisma.productionLine.upsert({ where: { name }, update: {}, create: { name } });
  }
  const inventoryCategories = [
    ["Dry Goods", "Shelf-stable powders, grains, and dry ingredients"],
    ["Liquids", "Water, oils, sauces, and other liquid materials"],
    ["Dairy", "Milk, cheese, butter, and refrigerated dairy inputs"],
    ["Vegetables", "Fresh and prepared vegetable ingredients"],
    ["Packaging", "Boxes, bags, labels, and disposable packaging"],
    ["Prepped Foods", "Semi-finished and finished prepared food items"]
  ] as const;
  for (const [name, description] of inventoryCategories) {
    await prisma.inventoryCategory.upsert({ where: { name }, update: { description }, create: { name, description } });
  }

  const warehouses = [
    ["WH-MAIN", "Main Warehouse", "Primary raw-material storage"],
    ["WH-BRANCH", "Branch Warehouse", "Branch-level inventory storage"]
  ] as const;
  for (const [code, name, description] of warehouses) {
    await prisma.warehouse.upsert({ where: { code }, update: { name, description }, create: { code, name, description } });
  }

  const password = tempPassword();
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      email: "admin@pino.local",
      displayName: "Pino Administrator",
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
      isActive: true
    },
    create: {
      username: "admin",
      email: "admin@pino.local",
      displayName: "Pino Administrator",
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true
    }
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "administrator" } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id, assignedBy: admin.id }
  });

  console.log("Roles seeded: administrator, supervisor, production_staff, warehouse_staff");
  console.log(`Permissions seeded: ${permissions.length} permissions`);
  console.log("Scope data seeded");
  console.log("Admin user created:");
  console.log("  Username: admin");
  console.log("  Email:    admin@pino.local");
  console.log(`  Password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
