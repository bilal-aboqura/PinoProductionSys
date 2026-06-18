export const SEARCH_SOURCES = [
  "inventory-items",
  "inventory-item-ids",
  "recipes",
  "production-orders",
  "batches",
  "users",
  "user-ids",
  "departments",
  "production-lines",
  "printing"
] as const;

export type SearchSource = (typeof SEARCH_SOURCES)[number];

export type SearchSuggestion = {
  value: string;
  label: string;
  description?: string;
};
