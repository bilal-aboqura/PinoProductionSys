export function resolveNotificationHref(locale: string, relatedEntityType: string | null, relatedEntityId: string | null) {
  if (!relatedEntityType || !relatedEntityId) return `/${locale}/notifications`;

  const encodedId = encodeURIComponent(relatedEntityId);
  switch (relatedEntityType) {
    case "InventoryItem":
      return `/${locale}/inventory/items?item=${encodedId}`;
    case "InventoryBalance":
      return `/${locale}/inventory?item=${encodedId}`;
    case "ProductionOrder":
      return `/${locale}/production/${encodedId}`;
    case "ProductionBatch":
    case "Batch":
      return `/${locale}/inventory/batches/${encodedId}`;
    case "Warehouse":
      return `/${locale}/inventory/warehouses?warehouse=${encodedId}`;
    default:
      return `/${locale}/notifications`;
  }
}

export function notificationAgeLabel(createdAt: string | Date) {
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
