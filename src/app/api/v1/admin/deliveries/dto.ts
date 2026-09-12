import type {
  DeliveryKind,
  DeliveryMethodRecord,
  ShipmentRecord,
} from "@/modules/delivery";

export interface DeliveryMethodDto {
  code: string;
  name: string;
  kind: DeliveryKind;
  isActive: boolean;
  freeThresholdMinor: number | null;
}

export interface ShipmentDto {
  id: string;
  orderId: string;
  methodCode: string;
  costMinor: number;
  status: ShipmentRecord["status"];
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  notes: string | null;
}

export function toDeliveryMethodDto(method: DeliveryMethodRecord): DeliveryMethodDto {
  return {
    code: method.code,
    name: method.name,
    kind: method.kind,
    isActive: method.isActive,
    freeThresholdMinor: method.freeThresholdMinor,
  };
}

export function toShipmentDto(shipment: ShipmentRecord): ShipmentDto {
  return {
    id: shipment.id,
    orderId: shipment.orderId,
    methodCode: shipment.methodCode,
    costMinor: shipment.costMinor,
    status: shipment.status,
    carrierName: shipment.carrierName,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    shippedAt: shipment.shippedAt ? shipment.shippedAt.toISOString() : null,
    deliveredAt: shipment.deliveredAt ? shipment.deliveredAt.toISOString() : null,
    notes: shipment.notes,
  };
}
