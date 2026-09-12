import { z } from "zod";
import { ValidationError } from "@/lib/errors";
import { parseWithSchema } from "./validation";

export type SortDirection = "asc" | "desc";

export interface SortQuery<Field extends string> {
  field: Field;
  direction: SortDirection;
}

const sortQuerySchema = z.object({
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export function parseSortQuery<Field extends string>(
  input: Record<string, string>,
  allowed: readonly Field[],
  fallback: SortQuery<Field>,
): SortQuery<Field> {
  const raw = parseWithSchema(sortQuerySchema, input);
  if (raw.sort === undefined) {
    return fallback;
  }
  if (!allowed.includes(raw.sort as Field)) {
    throw new ValidationError(`sort: must be one of ${allowed.join(", ")}`);
  }
  return {
    field: raw.sort as Field,
    direction: raw.order ?? fallback.direction,
  };
}

export function compareBy<T>(
  left: T,
  right: T,
  read: (item: T) => string | number | Date | null,
  direction: SortDirection,
): number {
  const a = read(left);
  const b = read(right);
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  const av = a instanceof Date ? a.getTime() : a;
  const bv = b instanceof Date ? b.getTime() : b;
  if (av < bv) {
    return direction === "asc" ? -1 : 1;
  }
  if (av > bv) {
    return direction === "asc" ? 1 : -1;
  }
  return 0;
}
