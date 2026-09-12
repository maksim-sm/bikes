import { prisma, type PrismaClient } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import type {
  DeliveryRepository,
  ShipmentRecord,
  ShipmentRepository,
} from "../application/ports";
import type { DeliveryKind, DeliveryMethodRecord, DeliveryZone } from "../domain/quote";

const KIND_FROM_PRISMA: Record<"COURIER" | "PICKUP" | "REGIONAL", DeliveryKind> = {
  COURIER: "courier",
  PICKUP: "pickup",
  REGIONAL: "regional",
};

function toMethod(row: {
  code: string;
  name: string;
  isActive: boolean;
  kind: keyof typeof KIND_FROM_PRISMA;
  pickupRegion: string | null;
  pickupCity: string | null;
  pickupStreet: string | null;
  pickupPostalCode: string | null;
  freeThresholdMinor: number | null;
}): DeliveryMethodRecord {
  const pickup =
    row.kind === "PICKUP" &&
    row.pickupRegion &&
    row.pickupCity &&
    row.pickupStreet &&
    row.pickupPostalCode
      ? {
          region: row.pickupRegion,
          city: row.pickupCity,
          street: row.pickupStreet,
          postalCode: row.pickupPostalCode,
        }
      : null;
  return {
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    kind: KIND_FROM_PRISMA[row.kind],
    pickup,
    freeThresholdMinor: row.freeThresholdMinor,
  };
}

function toZone(row: {
  id: string;
  name: string;
  region: string;
  city: string;
  costMinor: number;
  estimatedDays: number;
  estimatedText: string;
  isActive: boolean;
  method: { code: string };
}): DeliveryZone {
  return {
    id: row.id,
    methodCode: row.method.code,
    name: row.name,
    region: row.region,
    city: row.city,
    costMinor: row.costMinor,
    estimatedDays: row.estimatedDays,
    estimatedText: row.estimatedText,
    isActive: row.isActive,
  };
}

export function createPrismaDeliveryRepository(
  client: PrismaClient = prisma,
): DeliveryRepository {
  return {
    async getMethod(code) {
      const row = await client.deliveryMethod.findUnique({ where: { code } });
      return row ? toMethod(row) : null;
    },
    async listMethods() {
      const rows = await client.deliveryMethod.findMany({
        orderBy: { code: "asc" },
      });
      return rows.map(toMethod);
    },
    async listActiveMethods() {
      const rows = await client.deliveryMethod.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
      });
      return rows.map(toMethod);
    },
    async listZones(methodCode) {
      const rows = await client.deliveryZone.findMany({
        where: { method: { code: methodCode } },
        include: { method: { select: { code: true } } },
        orderBy: [{ region: "asc" }, { city: "asc" }],
      });
      return rows.map(toZone);
    },
  };
}

function toShipment(row: {
  id: string;
  orderId: string;
  costMinor: number;
  status: ShipmentRecord["status"];
  trackingNumber: string | null;
  method: { code: string };
}): ShipmentRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    methodCode: row.method.code,
    costMinor: row.costMinor,
    status: row.status,
    trackingNumber: row.trackingNumber,
  };
}

export function createPrismaShipmentRepository(
  client: PrismaClient = prisma,
): ShipmentRepository {
  return {
    async findByOrder(orderId) {
      const row = await client.delivery.findUnique({
        where: { orderId },
        include: { method: { select: { code: true } } },
      });
      return row ? toShipment(row) : null;
    },
    async save(shipment) {
      const method = await client.deliveryMethod.findUnique({
        where: { code: shipment.methodCode },
      });
      if (!method) {
        throw new NotFoundError("delivery method not found", {
          methodCode: shipment.methodCode,
        });
      }
      const row = await client.delivery.upsert({
        where: { orderId: shipment.orderId },
        create: {
          id: shipment.id,
          orderId: shipment.orderId,
          deliveryMethodId: method.id,
          status: shipment.status,
          costMinor: shipment.costMinor,
          trackingNumber: shipment.trackingNumber,
        },
        update: {
          deliveryMethodId: method.id,
          status: shipment.status,
          costMinor: shipment.costMinor,
          trackingNumber: shipment.trackingNumber,
          ...(shipment.status === "SHIPPED" ? { shippedAt: new Date() } : {}),
          ...(shipment.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
          ...(shipment.status === "FAILED" ? { failedAt: new Date() } : {}),
        },
        include: { method: { select: { code: true } } },
      });
      return toShipment(row);
    },
  };
}
