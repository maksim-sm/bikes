import { describe, expect, it } from "vitest";
import { demoEmonda } from "@/modules/catalog";
import {
  findVariant,
  resolveSelection,
  uniqueColors,
  uniqueFrameSizes,
} from "./variant-selection";

describe("variant selection", () => {
  const variants = demoEmonda.variants;

  it("lists size and color options without duplicates", () => {
    expect(uniqueFrameSizes(variants)).toEqual(["M", "L"]);
    expect(uniqueColors(variants)).toEqual(["чёрный", "красный"]);
  });

  it("finds the exact size and color pair", () => {
    expect(findVariant(variants, "M", "красный")?.id).toBe("v-emonda-m-red");
    expect(findVariant(variants, "S", "чёрный")).toBeNull();
  });

  it("falls back to the same size when the color is missing", () => {
    const resolved = resolveSelection(variants, "L", "синий");
    expect(resolved?.frameSize).toBe("L");
    expect(resolved?.id).toBe("v-emonda-l-black");
  });
});
