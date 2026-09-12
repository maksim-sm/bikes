import type { DeliveryMethodRecord, DeliveryZone, Destination } from "../domain/quote";
import type { ShipmentRecord } from "../domain/shipment";

export interface DeliveryRepository {
  getMethod(code: string): Promise<DeliveryMethodRecord | null>;
  listMethods(): Promise<DeliveryMethodRecord[]>;
  listActiveMethods(): Promise<DeliveryMethodRecord[]>;
  listZones(methodCode: string): Promise<DeliveryZone[]>;
}

export interface ShipmentRepository {
  findByOrder(orderId: string): Promise<ShipmentRecord | null>;
  save(shipment: ShipmentRecord): Promise<ShipmentRecord>;
}

export type { Destination, ShipmentRecord };
