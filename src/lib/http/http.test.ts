import { describe, expect, it } from "vitest";
import { ConflictError, RateLimitedError, ValidationError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { failure, readRequestId, success } from "./envelope";
import { toHttpError } from "./errors";
import { parseFilters } from "./filter";
import { paginate, parsePageQuery } from "./pagination";
import { compareBy, parseSortQuery } from "./sort";
import { parseWithSchema, searchParamsObject } from "./validation";
import { z } from "zod";

describe("HTTP envelope", () => {
  it("echoes a client request id and omits meta when there is no page", () => {
    const headers = new Headers({ "x-request-id": "req-1" });
    expect(readRequestId(headers)).toBe("req-1");
    expect(success("req-1", { slug: "emonda" })).toEqual({
      ok: true,
      requestId: "req-1",
      data: { slug: "emonda" },
    });
    expect(failure("req-1", "not_found", "product not found")).toEqual({
      ok: false,
      requestId: "req-1",
      error: { code: "not_found", message: "product not found" },
    });
  });
});

describe("error mapping", () => {
  it("maps known AppError codes and hides unexpected details", () => {
    expect(toHttpError(new ConflictError("insufficient available inventory"))).toEqual({
      status: 409,
      code: "conflict",
      message: t.errors.conflict,
    });
    expect(toHttpError(new Error("ECONNRESET boom"))).toEqual({
      status: 500,
      code: "internal_error",
      message: t.errors.internal_error,
    });
    expect(toHttpError(new RateLimitedError("too many", { retryAfterSec: 42 }))).toEqual({
      status: 429,
      code: "rate_limited",
      message: t.errors.rate_limited,
      retryAfterSec: 42,
    });
  });
});

describe("validation, pagination, sort, filter", () => {
  it("rejects unknown filters and oversized pages", () => {
    const url = new URL(
      "http://localhost/api/v1/products?page=2&pageSize=10&category=road&sort=name&order=asc",
    );
    const query = searchParamsObject(url);
    expect(parsePageQuery(query)).toEqual({ page: 2, pageSize: 10 });
    expect(parseFilters(query, ["category", "q"])).toEqual({ category: "road" });
    expect(
      parseSortQuery(query, ["name", "publishedAt"] as const, {
        field: "name",
        direction: "asc",
      }),
    ).toEqual({
      field: "name",
      direction: "asc",
    });
    expect(() => parseFilters({ bogus: "1" }, ["category"])).toThrow(ValidationError);
    expect(() => parsePageQuery({ pageSize: "500" })).toThrow(ValidationError);
  });

  it("paginates after sorting", () => {
    const rows = [{ name: "b" }, { name: "a" }, { name: "c" }];
    rows.sort((left, right) => compareBy(left, right, (row) => row.name, "asc"));
    const page = paginate(rows, { page: 1, pageSize: 2 });
    expect(page.items.map((row) => row.name)).toEqual(["a", "b"]);
    expect(page.meta).toEqual({ page: 1, pageSize: 2, total: 3 });
  });

  it("parses JSON bodies with Zod at the boundary", () => {
    const body = parseWithSchema(z.object({ quantity: z.number().int().positive() }), {
      quantity: 2,
    });
    expect(body.quantity).toBe(2);
    expect(() =>
      parseWithSchema(z.object({ quantity: z.number() }), { quantity: "x" }),
    ).toThrow(ValidationError);
  });
});
