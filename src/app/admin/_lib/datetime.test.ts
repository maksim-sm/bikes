import { describe, expect, it } from "vitest";
import { fromDateTimeLocal, toDateTimeLocal } from "./datetime";

describe("admin datetime-local", () => {
  it("round-trips a local timestamp and treats a blank as empty", () => {
    const date = new Date(2026, 8, 12, 15, 30);
    expect(fromDateTimeLocal(toDateTimeLocal(date))).toEqual(date);
    expect(fromDateTimeLocal("")).toBeNull();
    expect(fromDateTimeLocal("not-a-date")).toBe("invalid");
  });
});
