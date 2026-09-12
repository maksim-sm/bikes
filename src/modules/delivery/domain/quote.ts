export type DeliveryKind = "courier" | "pickup";

export interface PickupPoint {
  region: string;
  city: string;
  street: string;
  postalCode: string;
}

export interface Destination {
  region: string;
  city: string;
}

export interface DeliveryZone {
  id: string;
  methodCode: string;
  name: string;
  region: string;
  city: string;
  costMinor: number;
  estimatedDays: number;
  isActive: boolean;
}

export interface DeliveryQuote {
  methodCode: string;
  methodName: string;
  costMinor: number;
  estimatedDays: number;
  kind: DeliveryKind;
  pickup: PickupPoint | null;
}

export interface DeliveryMethodRecord {
  code: string;
  name: string;
  isActive: boolean;
  kind: DeliveryKind;
  pickup: PickupPoint | null;
}

export function matchZone(
  zones: readonly DeliveryZone[],
  destination: Destination,
): DeliveryZone | null {
  const region = destination.region.trim().toLowerCase();
  const city = destination.city.trim().toLowerCase();
  const active = zones.filter(
    (zone) => zone.isActive && zone.region.toLowerCase() === region,
  );
  const cityMatch = active.find((zone) => zone.city.toLowerCase() === city);
  if (cityMatch) {
    return cityMatch;
  }
  return active.find((zone) => zone.city === "") ?? null;
}

export function quoteMethod(
  method: DeliveryMethodRecord,
  zones: readonly DeliveryZone[],
  destination: Destination,
): DeliveryQuote | null {
  if (!method.isActive) {
    return null;
  }
  const zone = matchZone(
    zones.filter((item) => item.methodCode === method.code),
    destination,
  );
  if (!zone) {
    return null;
  }
  return {
    methodCode: method.code,
    methodName: method.name,
    costMinor: zone.costMinor,
    estimatedDays: zone.estimatedDays,
    kind: method.kind,
    pickup: method.kind === "pickup" ? method.pickup : null,
  };
}

export type ShipmentStatus = "ASSIGNED" | "SHIPPED" | "DELIVERED" | "FAILED";

export function nextShipmentStatus(
  current: ShipmentStatus,
  action: "ship" | "deliver" | "fail",
): ShipmentStatus {
  if (action === "ship" && current === "ASSIGNED") {
    return "SHIPPED";
  }
  if (action === "deliver" && current === "SHIPPED") {
    return "DELIVERED";
  }
  if (action === "fail" && (current === "ASSIGNED" || current === "SHIPPED")) {
    return "FAILED";
  }
  throw new Error("invalid_shipment_transition");
}
