import type { DeliveryMethodRecord, DeliveryZone, Destination } from "../domain/quote";

export interface DeliveryRepository {
  getMethod(code: string): Promise<DeliveryMethodRecord | null>;
  listActiveMethods(): Promise<DeliveryMethodRecord[]>;
  listZones(methodCode: string): Promise<DeliveryZone[]>;
}

export interface ShipmentRecord {
  id: string;
  orderId: string;
  methodCode: string;
  costMinor: number;
  status: "ASSIGNED" | "SHIPPED" | "DELIVERED" | "FAILED";
  trackingNumber: string | null;
}

export interface ShipmentRepository {
  findByOrder(orderId: string): Promise<ShipmentRecord | null>;
  save(shipment: ShipmentRecord): Promise<ShipmentRecord>;
}

export type { Destination };
