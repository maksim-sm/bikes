import { t } from "@/lib/i18n";
import type { DeliveryMethodRecord, DeliveryZone } from "../domain/quote";
import type {
  DeliveryRepository,
  ShipmentRecord,
  ShipmentRepository,
} from "../application/ports";

const courier: DeliveryMethodRecord = {
  code: "minsk-courier",
  name: t.delivery.methodCourier,
  isActive: true,
  kind: "courier",
  pickup: null,
  freeThresholdMinor: 1_000_000,
};

const pickup: DeliveryMethodRecord = {
  code: "minsk-pickup",
  name: t.delivery.methodPickup,
  isActive: true,
  kind: "pickup",
  pickup: {
    region: t.delivery.pickupRegion,
    city: t.delivery.pickupCity,
    street: t.delivery.pickupStreet,
    postalCode: t.delivery.pickupPostalCode,
  },
  freeThresholdMinor: null,
};

const regional: DeliveryMethodRecord = {
  code: "by-regional",
  name: t.delivery.methodRegional,
  isActive: true,
  kind: "regional",
  pickup: null,
  freeThresholdMinor: 300_000,
};

const methods: DeliveryMethodRecord[] = [courier, pickup, regional];

const REGIONAL_ZONES: ReadonlyArray<{
  id: string;
  region: string;
  name: string;
  costMinor: number;
  estimatedDays: number;
  estimatedText: string;
}> = [
  {
    id: "z-regional-minskaya",
    region: "Минская",
    name: t.delivery.zoneMinskaya,
    costMinor: 5000,
    estimatedDays: 3,
    estimatedText: t.delivery.estimateRegionalNear,
  },
  {
    id: "z-regional-brest",
    region: "Брестская",
    name: t.delivery.zoneBrest,
    costMinor: 8000,
    estimatedDays: 5,
    estimatedText: t.delivery.estimateRegional,
  },
  {
    id: "z-regional-vitebsk",
    region: "Витебская",
    name: t.delivery.zoneVitebsk,
    costMinor: 9000,
    estimatedDays: 5,
    estimatedText: t.delivery.estimateRegional,
  },
  {
    id: "z-regional-gomel",
    region: "Гомельская",
    name: t.delivery.zoneGomel,
    costMinor: 9000,
    estimatedDays: 5,
    estimatedText: t.delivery.estimateRegional,
  },
  {
    id: "z-regional-grodno",
    region: "Гродненская",
    name: t.delivery.zoneGrodno,
    costMinor: 8000,
    estimatedDays: 5,
    estimatedText: t.delivery.estimateRegional,
  },
  {
    id: "z-regional-mogilev",
    region: "Могилёвская",
    name: t.delivery.zoneMogilev,
    costMinor: 9000,
    estimatedDays: 5,
    estimatedText: t.delivery.estimateRegional,
  },
];

const zones: DeliveryZone[] = [
  {
    id: "z-minsk-courier",
    methodCode: "minsk-courier",
    name: t.delivery.zoneMinsk,
    region: "Минск",
    city: "Минск",
    costMinor: 2500,
    estimatedDays: 1,
    estimatedText: t.delivery.estimateCourier,
    isActive: true,
  },
  {
    id: "z-minsk-pickup",
    methodCode: "minsk-pickup",
    name: t.delivery.zonePickup,
    region: "",
    city: "",
    costMinor: 0,
    estimatedDays: 0,
    estimatedText: t.delivery.estimatePickup,
    isActive: true,
  },
  ...REGIONAL_ZONES.map((zone) => ({
    id: zone.id,
    methodCode: "by-regional",
    name: zone.name,
    region: zone.region,
    city: "",
    costMinor: zone.costMinor,
    estimatedDays: zone.estimatedDays,
    estimatedText: zone.estimatedText,
    isActive: true,
  })),
];

export function createDemoDeliveryRepository(): DeliveryRepository {
  return {
    async getMethod(code) {
      return methods.find((method) => method.code === code) ?? null;
    },
    async listMethods() {
      return [...methods];
    },
    async listActiveMethods() {
      return methods.filter((method) => method.isActive);
    },
    async listZones(methodCode) {
      return zones.filter((zone) => zone.methodCode === methodCode);
    },
  };
}

export function createMemoryShipments(
  seed: readonly ShipmentRecord[] = [],
): ShipmentRepository {
  const rows = new Map<string, ShipmentRecord>(
    seed.map((shipment) => [shipment.orderId, shipment]),
  );
  return {
    async findByOrder(orderId) {
      return rows.get(orderId) ?? null;
    },
    async save(shipment) {
      rows.set(shipment.orderId, shipment);
      return shipment;
    },
  };
}
