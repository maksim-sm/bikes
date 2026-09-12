import type { DeliveryMethodRecord, DeliveryZone } from "../domain/quote";
import type { DeliveryRepository, ShipmentRepository } from "../application/ports";

const courier: DeliveryMethodRecord = {
  code: "minsk-courier",
  name: "Курьер по Минску",
  isActive: true,
  kind: "courier",
  pickup: null,
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
};

const methods: DeliveryMethodRecord[] = [courier, pickup];

const zones: DeliveryZone[] = [
  {
    id: "z-minsk-courier",
    methodCode: "minsk-courier",
    name: "Минск",
    region: "Минск",
    city: "Минск",
    costMinor: 2500,
    estimatedDays: 1,
    isActive: true,
  },
  {
    id: "z-minsk-pickup",
    methodCode: "minsk-pickup",
    name: "Магазин в Минске",
    region: "Минск",
    city: "Минск",
    costMinor: 0,
    estimatedDays: 0,
    isActive: true,
  },
];

export function createDemoDeliveryRepository(): DeliveryRepository {
  return {
    async getMethod(code) {
      return methods.find((method) => method.code === code) ?? null;
    },
    async listActiveMethods() {
      return methods.filter((method) => method.isActive);
    },
    async listZones(methodCode) {
      return zones.filter((zone) => zone.methodCode === methodCode);
    },
  };
}

export function createMemoryShipments(): ShipmentRepository {
  return {
    async findByOrder() {
      return null;
    },
    async save(shipment) {
      return shipment;
    },
  };
}
