import type { ShipmentStatus } from "./quote";

export interface ShipmentTracking {
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  notes: string | null;
}

export interface ShipmentRecord extends ShipmentTracking {
  id: string;
  orderId: string;
  methodCode: string;
  costMinor: number;
  status: ShipmentStatus;
}

export const CARRIER_NAME_MAX = 80;
export const TRACKING_NUMBER_MAX = 80;
export const TRACKING_URL_MAX = 500;
export const DELIVERY_NOTES_MAX = 2000;

export function emptyTracking(): ShipmentTracking {
  return {
    carrierName: null,
    trackingNumber: null,
    trackingUrl: null,
    shippedAt: null,
    deliveredAt: null,
    notes: null,
  };
}

export function normalizeOptionalText(
  value: string | null,
  field: string,
  max: number,
): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > max) {
    throw new Error(`${field}_too_long`);
  }
  return trimmed;
}

export function normalizeTrackingUrl(value: string | null): string | null {
  const trimmed = normalizeOptionalText(value, "trackingUrl", TRACKING_URL_MAX);
  if (trimmed === null) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("tracking_url_invalid");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("tracking_url_invalid");
  }
  return parsed.toString();
}

export function normalizeTracking(input: ShipmentTracking): ShipmentTracking {
  const shippedAt = input.shippedAt;
  const deliveredAt = input.deliveredAt;
  if (shippedAt !== null && Number.isNaN(shippedAt.getTime())) {
    throw new Error("shipped_at_invalid");
  }
  if (deliveredAt !== null && Number.isNaN(deliveredAt.getTime())) {
    throw new Error("delivered_at_invalid");
  }
  if (shippedAt !== null && deliveredAt !== null && deliveredAt < shippedAt) {
    throw new Error("delivered_before_shipped");
  }
  return {
    carrierName: normalizeOptionalText(
      input.carrierName,
      "carrierName",
      CARRIER_NAME_MAX,
    ),
    trackingNumber: normalizeOptionalText(
      input.trackingNumber,
      "trackingNumber",
      TRACKING_NUMBER_MAX,
    ),
    trackingUrl: normalizeTrackingUrl(input.trackingUrl),
    shippedAt,
    deliveredAt,
    notes: normalizeOptionalText(input.notes, "notes", DELIVERY_NOTES_MAX),
  };
}
