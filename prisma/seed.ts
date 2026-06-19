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
  ["notifications:view", "View Notifications", "notifications", "view"],
  ["notifications:manage_rules", "Manage Alert Rules", "notifications", "manage_rules"],
  ["printing:view", "View Print Queue", "printing", "view"],
  ["printing:create", "Create Print Jobs", "printing", "create"],
  ["printing:reprint", "Authorize Reprints", "printing", "reprint"],
  ["printing:manage_printers", "Manage Printers", "printing", "manage_printers"],
  ["settings:view", "View Settings", "settings", "view"],
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
    "reports:view",
    "notifications:view",
    "notifications:manage_rules",
    "printing:view",
    "printing:create",
    "printing:reprint",
    "settings:view"
  ],
  production_staff: [
    "production:view",
    "production:execute",
    "production-orders:view",
    "production-orders:claim",
    "production-orders:execute",
    "production-orders:complete",
    "recipes:view",
    "printing:view",
    "printing:create",
    "notifications:view"
  ],
  warehouse_staff: [
    "inventory:view",
    "inventory:manage",
    "inventory:adjust",
    "inventory:transfer",
    "recipes:view",
    "printing:view",
    "printing:create",
    "notifications:view"
  ]
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

  const departments = [
    ["Bakery", "Bakery", "المخبز", "Bread and dough preparation"],
    ["Pizza", "Pizza", "البيتزا", "Pizza production"],
    ["Kitchen", "Kitchen", "المطبخ", "General kitchen operations"]
  ] as const;
  for (const [name, nameEn, nameAr, description] of departments) {
    await prisma.department.upsert({ where: { name }, update: { nameEn, nameAr, description }, create: { name, nameEn, nameAr, description } });
  }
  for (const name of ["Dough", "Sauces", "Desserts"]) {
    await prisma.recipeCategory.upsert({
      where: { name },
      update: { nameAr: name, nameEn: name },
      create: { name, nameAr: name, nameEn: name }
    });
  }
  const productionLines = [
    ["Main Kitchen", "Main Kitchen", "المطبخ الرئيسي", "Core production line"],
    ["Pizza Station", "Pizza Station", "محطة البيتزا", "Pizza assembly and baking"]
  ] as const;
  for (const [name, nameEn, nameAr, description] of productionLines) {
    await prisma.productionLine.upsert({ where: { name }, update: { nameEn, nameAr, description }, create: { name, nameEn, nameAr, description } });
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
    ["WH-MAIN", "Main Warehouse", "المخزن الرئيسي", "Primary raw-material storage"],
    ["WH-BRANCH", "Branch Warehouse", "مخزن الفرع", "Branch-level inventory storage"]
  ] as const;
  for (const [code, name, nameAr, description] of warehouses) {
    const existingWarehouse = await prisma.warehouse.findFirst({ where: { OR: [{ code }, { name }] } });
    if (existingWarehouse) {
      await prisma.warehouse.update({ where: { id: existingWarehouse.id }, data: { code, name, nameEn: name, nameAr, description } });
    } else {
      await prisma.warehouse.create({ data: { code, name, nameEn: name, nameAr, description } });
    }
  }

  const storageConditions = [
    { nameEn: "Room Temperature", nameAr: "درجة حرارة الغرفة", description: "Dry ambient storage", minTemperature: 18, maxTemperature: 25 },
    { nameEn: "Chilled", nameAr: "مبرد", description: "Refrigerated storage", minTemperature: 0, maxTemperature: 5 },
    { nameEn: "Frozen", nameAr: "مجمد", description: "Freezer storage", minTemperature: -25, maxTemperature: -18 }
  ];
  for (const condition of storageConditions) {
    const existing = await prisma.storageCondition.findFirst({ where: { nameEn: condition.nameEn } });
    const data = { ...condition, minTemperature: condition.minTemperature, maxTemperature: condition.maxTemperature };
    if (existing) {
      await prisma.storageCondition.update({ where: { id: existing.id }, data });
    } else {
      await prisma.storageCondition.create({ data });
    }
  }

  const labelTemplates = [
    ["Small Label", "40x25mm"],
    ["Standard Label", "50x30mm"],
    ["Large Label", "80x50mm"]
  ] as const;
  for (const [name, dimensions] of labelTemplates) {
    await prisma.labelPrintTemplate.upsert({ where: { name }, update: { dimensions }, create: { name, dimensions } });
  }

  const printTemplates = [
    ["Small Label 50x50mm", "50x50mm"],
    ["Standard Label 100x50mm", "100x50mm"],
    ["Large Label 100x100mm", "100x100mm"]
  ] as const;
  for (const [name, dimensions] of printTemplates) {
    await prisma.printTemplate.upsert({ where: { name }, update: { dimensions, isActive: true }, create: { name, dimensions } });
  }

  const printers = [
    { name: "Kitchen Thermal Printer", description: "Default thermal label printer", type: "THERMAL" as const, isDefault: true },
    { name: "Office Document Printer", description: "Default A4 document printer", type: "STANDARD" as const, isDefault: false }
  ];
  for (const printer of printers) {
    await prisma.printer.upsert({
      where: { name: printer.name },
      update: { description: printer.description, type: printer.type, isDefault: printer.isDefault, isActive: true },
      create: { ...printer, isActive: true }
    });
  }

  const wasteReasons = [
    ["SPOILAGE", "Spoilage", "تلف", "Food spoiled before use"],
    ["BURNED_BATCH", "Burned Batch", "دفعة محترقة", "Production batch burned"],
    ["PRODUCTION_LOSS", "Production Loss", "فاقد إنتاج", "Loss during production"],
    ["DAMAGED_MATERIAL", "Damaged Material", "مواد تالفة", "Damaged raw material"]
  ] as const;
  for (const [code, nameEn, nameAr, description] of wasteReasons) {
    await prisma.wasteReasonOption.upsert({ where: { code }, update: { nameEn, nameAr, description }, create: { code, nameEn, nameAr, description } });
  }

  const systemSettings = [
    {
      key: "general_preferences",
      description: "Company localization and date defaults",
      value: { companyName: "Pino Restaurant", companyLogoUrl: "/images/logo.png", timeZone: "Africa/Cairo", dateFormat: "YYYY-MM-DD", defaultLanguage: "ar" }
    },
    {
      key: "qr_config",
      description: "QR rendering defaults",
      value: { qrEnabled: true, qrSize: 150, errorCorrectionLevel: "M" }
    },
    {
      key: "notification_thresholds",
      description: "Operational alert thresholds",
      value: { lowStockThresholdPercent: 10, nearExpiryThresholdDays: 7, productionDelayThresholdMinutes: 30 }
    }
  ] as const;
  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: { key: setting.key, value: setting.value, description: setting.description }
    });
  }

  const alertRules = [
    {
      name: "Low Stock",
      category: "INVENTORY",
      triggerType: "LOW_STOCK",
      parameters: { thresholdMode: "itemMinStock" },
      severity: "WARNING",
      targetRoles: ["warehouse_staff", "supervisor"]
    },
    {
      name: "Negative Inventory",
      category: "INVENTORY",
      triggerType: "NEGATIVE_INVENTORY",
      parameters: { threshold: 0 },
      severity: "CRITICAL",
      targetRoles: ["warehouse_staff", "supervisor"]
    },
    {
      name: "Near Expiry Batch",
      category: "BATCH",
      triggerType: "NEAR_EXPIRY",
      parameters: { daysBefore: 7 },
      severity: "WARNING",
      targetRoles: ["warehouse_staff", "supervisor"]
    },
    {
      name: "Expired Batch",
      category: "BATCH",
      triggerType: "EXPIRED_BATCH",
      parameters: {},
      severity: "CRITICAL",
      targetRoles: ["warehouse_staff", "supervisor"]
    },
    {
      name: "Production Delay",
      category: "PRODUCTION",
      triggerType: "PRODUCTION_DELAY",
      parameters: { maxDurationMinutes: 120 },
      severity: "WARNING",
      targetRoles: ["supervisor"]
    }
  ] as const;

  for (const rule of alertRules) {
    await prisma.alertRule.upsert({
      where: { name: rule.name },
      update: {
        category: rule.category,
        triggerType: rule.triggerType,
        parameters: rule.parameters,
        severity: rule.severity,
        targetRoles: [...rule.targetRoles],
        isEnabled: true
      },
      create: {
        name: rule.name,
        category: rule.category,
        triggerType: rule.triggerType,
        parameters: rule.parameters,
        severity: rule.severity,
        targetRoles: [...rule.targetRoles]
      }
    });
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
  console.log(`Alert rules seeded: ${alertRules.length}`);
  console.log("Settings defaults seeded");
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
