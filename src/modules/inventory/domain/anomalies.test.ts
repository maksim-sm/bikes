import { describe, expect, it } from "vitest";
import { detectInventoryAnomalies } from "./anomalies";

describe("inventory anomalies", () => {
  const now = new Date("2026-09-13T12:00:00.000Z");

  it("flags oversell, negatives, and stale holds", () => {
    const anomalies = detectInventoryAnomalies({
      now,
      items: [
        { id: "i1", variantId: "v1", onHand: 1, reserved: 3 },
        { id: "i2", variantId: "v2", onHand: -1, reserved: 0 },
        { id: "i3", variantId: "v3", onHand: 2, reserved: -1 },
      ],
      dueActive: [
        {
          id: "r1",
          inventoryItemId: "i1",
          quantity: 1,
          status: "ACTIVE",
          expiresAt: new Date("2026-09-13T11:00:00.000Z"),
        },
      ],
      variantIdByItemId: new Map([
        ["i1", "v1"],
        ["i2", "v2"],
        ["i3", "v3"],
      ]),
    });
    expect(anomalies.map((row) => row.code)).toEqual([
      "reserved_exceeds_on_hand",
      "negative_on_hand",
      "negative_reserved",
      "stale_active_reservation",
    ]);
  });
});
