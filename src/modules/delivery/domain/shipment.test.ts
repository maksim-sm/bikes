import { describe, expect, it } from "vitest";
import { normalizeTracking, normalizeTrackingUrl } from "./shipment";

describe("shipment tracking", () => {
  it("stores a carrier URL and treats blank fields as empty", () => {
    expect(normalizeTrackingUrl("https://evropochta.by/track/BY123")).toBe(
      "https://evropochta.by/track/BY123",
    );
    expect(normalizeTrackingUrl("")).toBeNull();
    expect(() => normalizeTrackingUrl("ftp://files.example")).toThrow(
      "tracking_url_invalid",
    );
    expect(
      normalizeTracking({
        carrierName: "  Европочта  ",
        trackingNumber: " BY123 ",
        trackingUrl: "https://evropochta.by/track/BY123",
        shippedAt: new Date("2026-09-12T10:00:00.000Z"),
        deliveredAt: new Date("2026-09-13T12:00:00.000Z"),
        notes: "  оставить у охраны  ",
      }),
    ).toMatchObject({
      carrierName: "Европочта",
      trackingNumber: "BY123",
      notes: "оставить у охраны",
    });
  });

  it("rejects a delivery time before the ship time", () => {
    expect(() =>
      normalizeTracking({
        carrierName: null,
        trackingNumber: null,
        trackingUrl: null,
        shippedAt: new Date("2026-09-13T12:00:00.000Z"),
        deliveredAt: new Date("2026-09-12T10:00:00.000Z"),
        notes: null,
      }),
    ).toThrow("delivered_before_shipped");
  });
});
