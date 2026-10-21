import { describe, expect, it } from "vitest";

import { sum } from "./example-sum";

describe("sum", () => {
  it("складывает два числа", () => {
    expect(sum(2, 3)).toBe(5);
  });

  it("работает с отрицательными числами", () => {
    expect(sum(-2, 1)).toBe(-1);
  });
});
