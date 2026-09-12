import { describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { customerPrincipal, staffPrincipal } from "@/modules/identity";
import {
  applyFixedPrice,
  matchZone,
  quoteMethod,
  type DeliveryMethodRecord,
  type DeliveryZone,
} from "../domain/quote";
import type { DeliveryRepository, ShipmentRecord, ShipmentRepository } from "./ports";
import { createDeliveryServices } from "./services";

const courier: DeliveryMethodRecord = {
  code: "minsk-courier",
  name: "Курьер по Минску",
  isActive: true,
  kind: "courier",
  pickup: null,
  freeThresholdMinor: 1_000_000,
};

const regional: DeliveryMethodRecord = {
  code: "by-regional",
  name: "Доставка по Беларуси",
  isActive: true,
  kind: "regional",
  pickup: null,
  freeThresholdMinor: 300_000,
};

const pickup: DeliveryMethodRecord = {
  code: "minsk-pickup",
  name: "Самовывоз из магазина",
  isActive: true,
  kind: "pickup",
  pickup: {
    region: "Минск",
    city: "Минск",
    street: "пр-т Независимости 95",
    postalCode: "220012",
  },
  freeThresholdMinor: null,
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
    estimatedText: "1 рабочий день",
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
    estimatedText: "2–4 рабочих дня",
    isActive: true,
  },
  {
    id: "z3",
    methodCode: "by-regional",
    name: "Гродненская",
    region: "Гродненская",
    city: "",
    costMinor: 8000,
    estimatedDays: 5,
    estimatedText: "3–7 рабочих дней",
    isActive: true,
  },
  {
    id: "z4",
    methodCode: "minsk-pickup",
    name: "Магазин",
    region: "",
    city: "",
    costMinor: 0,
    estimatedDays: 0,
    estimatedText: "Можно забрать в день заказа",
    isActive: true,
  },
];

describe("delivery quotes", () => {
  it("prefers a city zone, then a region wildcard, then a country-wide pickup zone", () => {
    expect(matchZone(zones, { region: "Минск", city: "Минск" })?.costMinor).toBe(2500);
    expect(matchZone(zones, { region: "Минская", city: "Борисов" })?.costMinor).toBe(
      4000,
    );
    expect(
      matchZone(
        zones.filter((zone) => zone.methodCode === "minsk-courier"),
        { region: "Гродно", city: "Гродно" },
      ),
    ).toBeNull();
    expect(
      matchZone(
        zones.filter((zone) => zone.methodCode === "minsk-pickup"),
        { region: "Гродненская", city: "Гродно" },
      )?.costMinor,
    ).toBe(0);
    expect(
      quoteMethod({ ...courier, isActive: false }, zones, {
        region: "Минск",
        city: "Минск",
      }),
    ).toBeNull();
  });

  it("applies a configured free-delivery threshold and keeps the estimated text", () => {
    expect(applyFixedPrice(8000, 300_000, 299_999)).toBe(8000);
    expect(applyFixedPrice(8000, 300_000, 300_000)).toBe(0);
    expect(applyFixedPrice(8000, null, 300_000)).toBe(8000);
    const quoted = quoteMethod(regional, zones, {
      region: "Гродненская",
      city: "Гродно",
    });
    expect(quoted).toMatchObject({
      kind: "regional",
      costMinor: 8000,
      estimatedText: "3–7 рабочих дней",
    });
    expect(
      quoteMethod(
        regional,
        zones,
        { region: "Гродненская", city: "Гродно" },
        { subtotalMinor: 300_000 },
      )?.costMinor,
    ).toBe(0);
  });
});

describe("delivery services", () => {
  it("quotes and assigns a single shipment per order", async () => {
    const methods: DeliveryRepository = {
      async getMethod(code) {
        return [courier, pickup, regional].find((method) => method.code === code) ?? null;
      },
      async listMethods() {
        return [courier, pickup, regional];
      },
      async listActiveMethods() {
        return [courier, pickup, regional];
      },
      async listZones(methodCode) {
        return zones.filter((zone) => zone.methodCode === methodCode);
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
    expect(quote?.estimatedText).toBe("1 рабочий день");
    const regionalQuote = await delivery.quote(
      "by-regional",
      { region: "Гродненская", city: "Гродно" },
      { subtotalMinor: 349_900 },
    );
    expect(regionalQuote?.costMinor).toBe(0);
    const ops = staffPrincipal("ops", ["order_management"]);
    await expect(
      delivery.listMethods(customerPrincipal("user-1")),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(await delivery.listMethods(ops)).toHaveLength(3);
    await expect(
      delivery.assignShipment(customerPrincipal("user-1"), {
        orderId: "o1",
        methodCode: "minsk-courier",
        costMinor: 2500,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      delivery.assignShipment(ops, {
        orderId: "o1",
        methodCode: "missing",
        costMinor: 2500,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      delivery.assignShipment(ops, {
        orderId: "o1",
        methodCode: "minsk-courier",
        costMinor: -1,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    const assigned = await delivery.assignShipment(ops, {
      orderId: "o1",
      methodCode: "minsk-courier",
      costMinor: 2500,
    });
    const shipped = await delivery.markShipped(ops, "o1", "BY123");
    expect(assigned.status).toBe("ASSIGNED");
    expect(shipped.status).toBe("SHIPPED");
    expect(shipped.trackingNumber).toBe("BY123");
    expect(await delivery.getShipment(ops, "o1")).toMatchObject({
      orderId: "o1",
      status: "SHIPPED",
    });
  });
});
