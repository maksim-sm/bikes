import { describe, expect, it } from "vitest";
import { demoEmonda } from "@/modules/catalog";
import { pricesChanged, productAuditSnapshot } from "./product-audit";

describe("product audit snapshots", () => {
  it("records variant prices without descriptions or media", () => {
    const snap = productAuditSnapshot(demoEmonda);
    expect(snap.slug).toBe("emonda");
    expect(snap.prices[0]).toEqual({ sku: "EM-M-BLK", listPriceMinor: 349900 });
    expect(pricesChanged(snap, snap)).toBe(false);
    expect(
      pricesChanged(snap, {
        ...snap,
        prices: snap.prices.map((row, index) =>
          index === 0 ? { ...row, listPriceMinor: 1 } : row,
        ),
      }),
    ).toBe(true);
  });
});
