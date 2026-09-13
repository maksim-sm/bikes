import type { ZodType } from "zod";
import { ValidationError } from "@/lib/errors";
import { t, zodIssueMessage } from "@/lib/i18n";

export function parseWithSchema<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.length ? first.path.join(".") : "body";
    const detail = first ? zodIssueMessage(first) : t.validation.invalid;
    throw new ValidationError(`${path}: ${detail}`);
  }
  return parsed.data;
}

export function searchParamsObject(url: URL): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    result[key] = value;
  }
  return result;
}
