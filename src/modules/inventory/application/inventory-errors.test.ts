import { describe, expect, it } from "vitest";
import { ConflictError } from "@/lib/errors";
import { isInsufficientAvailable, mapInventoryWriteError } from "./inventory-errors";

describe("inventory write error mapping", () => {
  it("walks nested causes and treats PostgreSQL P0001 as an oversell", () => {
    const nested = new Error("tx failed", {
      cause: new Error("insufficient_available"),
    });
    expect(isInsufficientAvailable(nested)).toBe(true);
    expect(isInsufficientAvailable({ code: "P0001" })).toBe(true);
    expect(
      isInsufficientAvailable({
        message: "write failed",
        cause: { code: "P0001" },
      }),
    ).toBe(true);
    expect(() => mapInventoryWriteError({ code: "P0001" })).toThrow(ConflictError);
    expect(() => mapInventoryWriteError(nested)).toThrow(ConflictError);
    expect(() => mapInventoryWriteError(new Error("unrelated"))).toThrow("unrelated");
  });
});
