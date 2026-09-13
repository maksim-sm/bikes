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
import {
  createCapturingEmailChannel,
  createMemoryNotificationRepository,
  createNotificationServices,
} from "@/modules/notifications";
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
    expect(assigned).toMatchObject({
      status: "ASSIGNED",
      carrierName: null,
      trackingNumber: null,
      trackingUrl: null,
      shippedAt: null,
      deliveredAt: null,
      notes: null,
    });
    const shipped = await delivery.markShipped(ops, "o1", "BY123");
    expect(shipped.status).toBe("SHIPPED");
    expect(shipped.trackingNumber).toBe("BY123");
    expect(shipped.shippedAt).toBeInstanceOf(Date);
    const tracked = await delivery.updateTracking(ops, "o1", {
      carrierName: "Европочта",
      trackingNumber: "BY123",
      trackingUrl: "https://evropochta.by/track/BY123",
      shippedAt: shipped.shippedAt,
      deliveredAt: null,
      notes: "хрупкое",
    });
    expect(tracked).toMatchObject({
      carrierName: "Европочта",
      trackingUrl: "https://evropochta.by/track/BY123",
      notes: "хрупкое",
    });
    const delivered = await delivery.markDelivered(ops, "o1");
    expect(delivered.status).toBe("DELIVERED");
    expect(delivered.deliveredAt).toBeInstanceOf(Date);
    await expect(
      delivery.updateTracking(ops, "o1", {
        carrierName: "Европочта",
        trackingNumber: "BY123",
        trackingUrl: "not-a-url",
        shippedAt: shipped.shippedAt,
        deliveredAt: delivered.deliveredAt,
        notes: null,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await delivery.getShipment(ops, "o1")).toMatchObject({
      orderId: "o1",
      status: "DELIVERED",
      carrierName: "Европочта",
    });
    const forOwner = await delivery.getShipmentForOrder(ops, {
      id: "o1",
      userId: "user-1",
    });
    expect(forOwner?.trackingNumber).toBe("BY123");
    await expect(
      delivery.getShipmentForOrder(customerPrincipal("user-2"), {
        id: "o1",
        userId: "user-1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("notifies processing, shipped, and delivered after each shipment write", async () => {
    const channel = createCapturingEmailChannel();
    const notify = createNotificationServices({
      notifications: createMemoryNotificationRepository(),
      channel,
    });
    const methods: DeliveryRepository = {
      async getMethod() {
        return courier;
      },
      async listMethods() {
        return [courier];
      },
      async listActiveMethods() {
        return [courier];
      },
      async listZones() {
        return [];
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
    const delivery = createDeliveryServices({
      methods,
      shipments,
      notify,
      lookupRecipient: async () => ({
        email: "ira@example.by",
        name: "Ира",
        number: "B-9",
      }),
    });
    const ops = staffPrincipal("ops", ["order_management"]);
    await delivery.assignShipment(ops, {
      orderId: "o1",
      methodCode: "minsk-courier",
      costMinor: 2500,
    });
    await delivery.markShipped(ops, "o1", "BY123");
    await delivery.markDelivered(ops, "o1");
    expect(channel.sent.map((row) => row.event)).toEqual([
      "order.processing",
      "order.shipped",
      "order.delivered",
    ]);
    expect(channel.sent[1]?.payload.tracking).toBe("BY123");
  });
});
