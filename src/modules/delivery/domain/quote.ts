export type DeliveryKind = "courier" | "pickup" | "regional";

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

export interface QuoteOptions {
  subtotalMinor: number | null;
}

export interface DeliveryZone {
  id: string;
  methodCode: string;
  name: string;
  region: string;
  city: string;
  costMinor: number;
  estimatedDays: number;
  estimatedText: string;
  isActive: boolean;
}

export interface DeliveryQuote {
  methodCode: string;
  methodName: string;
  costMinor: number;
  estimatedDays: number;
  estimatedText: string;
  kind: DeliveryKind;
  pickup: PickupPoint | null;
}

export interface DeliveryMethodRecord {
  code: string;
  name: string;
  isActive: boolean;
  kind: DeliveryKind;
  pickup: PickupPoint | null;
  freeThresholdMinor: number | null;
}

export function applyFixedPrice(
  costMinor: number,
  freeThresholdMinor: number | null,
  subtotalMinor: number | null,
): number {
  if (
    freeThresholdMinor !== null &&
    subtotalMinor !== null &&
    subtotalMinor >= freeThresholdMinor
  ) {
    return 0;
  }
  return costMinor;
}

export function matchZone(
  zones: readonly DeliveryZone[],
  destination: Destination,
): DeliveryZone | null {
  const region = destination.region.trim().toLowerCase();
  const city = destination.city.trim().toLowerCase();
  const active = zones.filter((zone) => zone.isActive);
  const cityMatch = active.find(
    (zone) => zone.region.toLowerCase() === region && zone.city.toLowerCase() === city,
  );
  if (cityMatch) {
    return cityMatch;
  }
  const regionMatch = active.find(
    (zone) => zone.region.toLowerCase() === region && zone.city === "",
  );
  if (regionMatch) {
    return regionMatch;
  }
  return active.find((zone) => zone.region === "" && zone.city === "") ?? null;
}

export function quoteMethod(
  method: DeliveryMethodRecord,
  zones: readonly DeliveryZone[],
  destination: Destination,
  options: QuoteOptions = { subtotalMinor: null },
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
    costMinor: applyFixedPrice(
      zone.costMinor,
      method.freeThresholdMinor,
      options.subtotalMinor,
    ),
    estimatedDays: zone.estimatedDays,
    estimatedText: zone.estimatedText,
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
