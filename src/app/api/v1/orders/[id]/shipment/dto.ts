import type { ShipmentRecord } from "@/modules/delivery";

export interface CustomerShipmentDto {
  status: ShipmentRecord["status"];
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export function toCustomerShipmentDto(shipment: ShipmentRecord): CustomerShipmentDto {
  return {
    status: shipment.status,
    carrierName: shipment.carrierName,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    shippedAt: shipment.shippedAt ? shipment.shippedAt.toISOString() : null,
    deliveredAt: shipment.deliveredAt ? shipment.deliveredAt.toISOString() : null,
  };
}
