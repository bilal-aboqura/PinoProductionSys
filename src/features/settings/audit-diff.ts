export type JsonDiff = {
  changedKeys: string[];
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
};

function normalize(value: unknown): unknown {
  if (value && typeof value === "object" && "toString" in value && value.constructor?.name === "Decimal") {
    return value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function diffRecords(previous: Record<string, unknown> | null | undefined, next: Record<string, unknown>): JsonDiff {
  const previousValue = previous ?? {};
  const keys = Array.from(new Set([...Object.keys(previousValue), ...Object.keys(next)])).sort();
  const changedKeys = keys.filter((key) => JSON.stringify(normalize(previousValue[key])) !== JSON.stringify(normalize(next[key])));
  return {
    changedKeys,
    previousValue: Object.fromEntries(changedKeys.map((key) => [key, normalize(previousValue[key])])),
    newValue: Object.fromEntries(changedKeys.map((key) => [key, normalize(next[key])]))
  };
}
