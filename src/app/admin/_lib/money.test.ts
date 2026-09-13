import { describe, expect, it } from "vitest";
import { minorToBynInput, parsePriceBynToMinor } from "./money";

describe("admin price parsing", () => {
  it("converts BYN text to integer kopeks", () => {
    expect(parsePriceBynToMinor("2199")).toBe(219900);
    expect(parsePriceBynToMinor("2199,50")).toBe(219950);
    expect(parsePriceBynToMinor("10.5")).toBe(1050);
    expect(parsePriceBynToMinor("")).toBeNull();
    expect(parsePriceBynToMinor("12.345")).toBeNull();
    expect(parsePriceBynToMinor("0")).toBe(0);
    expect(parsePriceBynToMinor("0,99")).toBe(99);
    expect(parsePriceBynToMinor("0.01")).toBe(1);
    expect(parsePriceBynToMinor(" 10 ")).toBe(1000);
    expect(parsePriceBynToMinor("abc")).toBeNull();
    expect(parsePriceBynToMinor("-1")).toBeNull();
    expect(parsePriceBynToMinor("1,2,3")).toBeNull();
  });

  it("formats kopeks back to a form value", () => {
    expect(minorToBynInput(219900)).toBe("2199.00");
    expect(minorToBynInput(50)).toBe("0.50");
    expect(minorToBynInput(0)).toBe("0.00");
  });
});
