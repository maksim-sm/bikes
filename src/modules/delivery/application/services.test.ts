import { describe, expect, it } from "vitest";
import {
  matchZone,
  quoteMethod,
  type DeliveryMethodRecord,
  type DeliveryZone,
} from "../domain/quote";
import type { DeliveryRepository, ShipmentRecord, ShipmentRepository } from "./ports";
import { createDeliveryServices } from "./services";

const method: DeliveryMethodRecord = {
  code: "minsk-courier",
  name: "Курьер по Минску",
  isActive: true,
};

const zones: DeliveryZone[] = [
  {
    id: "z1",
    methodCode: "minsk-courier",
    name: "Минск",
    region: "Минск",
    city: "Минск",
    costMinor: 2500,
    estimatedDays: 1,
    isActive: true,
  },
  {
    id: "z2",
    methodCode: "minsk-courier",
    name: "Минская область",
    region: "Минская",
    city: "",
    costMinor: 4000,
    estimatedDays: 3,
    isActive: true,
  },
];

describe("delivery quotes", () => {
  it("prefers a city zone and falls back to the region wildcard", () => {
    expect(matchZone(zones, { region: "Минск", city: "Минск" })?.costMinor).toBe(2500);
    expect(matchZone(zones, { region: "Минская", city: "Борисов" })?.costMinor).toBe(
      4000,
    );
    expect(matchZone(zones, { region: "Гродно", city: "Гродно" })).toBeNull();
    expect(
      quoteMethod({ ...method, isActive: false }, zones, {
        region: "Минск",
        city: "Минск",
      }),
    ).toBeNull();
  });
});

describe("delivery services", () => {
  it("quotes and assigns a single shipment per order", async () => {
    const methods: DeliveryRepository = {
      async getMethod(code) {
        return code === method.code ? method : null;
      },
      async listActiveMethods() {
        return [method];
      },
      async listZones() {
        return zones;
      },
    };
    const rows = new Map<string, ShipmentRecord>();
    const shipments: ShipmentRepository = {
      async findByOrder(orderId) {
        return rows.get(orderId) ?? null;
      },
      async save(shipment) {
        rows.set(shipment.orderId, shipment);
        return shipment;
      },
    };
    const delivery = createDeliveryServices({ methods, shipments });
    const quote = await delivery.quote("minsk-courier", {
      region: "Минск",
      city: "Минск",
    });
    expect(quote?.costMinor).toBe(2500);
    const assigned = await delivery.assignShipment({
      orderId: "o1",
      methodCode: "minsk-courier",
      costMinor: 2500,
    });
    const shipped = await delivery.markShipped("o1", "BY123");
    expect(assigned.status).toBe("ASSIGNED");
    expect(shipped.status).toBe("SHIPPED");
    expect(shipped.trackingNumber).toBe("BY123");
  });
});
