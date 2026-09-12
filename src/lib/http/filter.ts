import { ValidationError } from "@/lib/errors";

/**
 * Keep only declared filter keys. Unknown query keys that are not pagination
 * or sort controls are rejected so clients cannot smuggle arbitrary fields.
 */
export function parseFilters(
  input: Record<string, string>,
  allowed: readonly string[],
  reserved: readonly string[] = ["page", "pageSize", "sort", "order"],
): Record<string, string> {
  const filters: Record<string, string> = {};
  const allow = new Set(allowed);
  const skip = new Set(reserved);

  for (const [key, value] of Object.entries(input)) {
    if (skip.has(key)) {
      continue;
    }
    if (!allow.has(key)) {
      throw new ValidationError(`filter: '${key}' is not supported`);
    }
    if (value.trim().length > 0) {
      filters[key] = value;
    }
  }
  return filters;
}
