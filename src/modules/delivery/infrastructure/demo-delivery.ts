import type { DeliveryMethodRecord, DeliveryZone } from "../domain/quote";
import type { DeliveryRepository, ShipmentRepository } from "../application/ports";

const method: DeliveryMethodRecord = {
  code: "minsk-courier",
  name: "Курьер по Минску",
  isActive: true,
};

const zones: DeliveryZone[] = [
  {
    id: "z-minsk",
    methodCode: "minsk-courier",
    name: "Минск",
    region: "Минск",
    city: "Минск",
    costMinor: 2500,
    estimatedDays: 1,
    isActive: true,
  },
];

export function createDemoDeliveryRepository(): DeliveryRepository {
  return {
    async getMethod(code) {
      return code === method.code ? method : null;
    },
    async listActiveMethods() {
      return [method];
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
