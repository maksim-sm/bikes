import { z } from "zod";
import type { PageMeta } from "./envelope";
import { parseWithSchema } from "./validation";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export interface PageQuery {
  page: number;
  pageSize: number;
}

export function parsePageQuery(input: Record<string, string>): PageQuery {
  return parseWithSchema(pageQuerySchema, input);
}

export function paginate<T>(
  items: readonly T[],
  query: PageQuery,
): { items: T[]; meta: PageMeta } {
  const start = (query.page - 1) * query.pageSize;
  return {
    items: items.slice(start, start + query.pageSize),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: items.length,
    },
  };
}
