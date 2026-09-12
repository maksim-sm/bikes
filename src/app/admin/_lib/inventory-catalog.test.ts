import { describe, expect, it } from "vitest";
import { demoEmonda } from "@/modules/catalog";
import {
  labelForVariant,
  matchesStockQuery,
  variantStockLabels,
} from "./inventory-catalog";

describe("admin inventory catalog labels", () => {
  const labels = variantStockLabels([demoEmonda]);

  it("maps catalogue variants without joining inventory", () => {
    const label = labels.get("v-emonda-m-black");
    expect(label?.sku).toBe("EM-M-BLK");
    expect(label?.productName).toBe(demoEmonda.name);
    expect(labelForVariant(labels, "missing").sku).toBe("missing");
  });

  it("filters stock rows by sku, model, size, or colour", () => {
    const black = labelForVariant(labels, "v-emonda-m-black");
    expect(matchesStockQuery(black, "em-m-blk")).toBe(true);
    expect(matchesStockQuery(black, "чёрн")).toBe(true);
    expect(matchesStockQuery(black, "M")).toBe(true);
    expect(matchesStockQuery(black, "красн")).toBe(false);
    expect(matchesStockQuery(black, "")).toBe(true);
  });
});
