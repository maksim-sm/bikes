import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  assertCanReadOrder,
  requireOrderManagementRole,
  type Principal,
} from "@/modules/identity";
import {
  nextShipmentStatus,
  quoteMethod,
  type DeliveryMethodRecord,
  type DeliveryQuote,
  type Destination,
  type QuoteOptions,
} from "../domain/quote";
import {
  emptyTracking,
  normalizeTracking,
  type ShipmentRecord,
  type ShipmentTracking,
} from "../domain/shipment";
import type { NotificationEvent, NotificationServices } from "@/modules/notifications";
import type { DeliveryRepository, ShipmentRepository } from "./ports";

export interface DeliveryOrderContact {
  email: string;
  name: string;
  number: string;
}

export interface Clock {
  now(): Date;
}

export interface DeliveryServices {
  quote(
    methodCode: string,
    destination: Destination,
    options?: QuoteOptions,
  ): Promise<DeliveryQuote | null>;
  listQuotes(destination: Destination, options?: QuoteOptions): Promise<DeliveryQuote[]>;
  listMethods(principal: Principal): Promise<DeliveryMethodRecord[]>;
  getShipment(principal: Principal, orderId: string): Promise<ShipmentRecord>;
  getShipmentForOrder(
    principal: Principal,
    order: { id: string; userId: string | null },
  ): Promise<ShipmentRecord | null>;
  assignShipment(
    principal: Principal,
    input: {
      orderId: string;
      methodCode: string;
      costMinor: number;
    },
  ): Promise<ShipmentRecord>;
  updateTracking(
    principal: Principal,
    orderId: string,
    tracking: ShipmentTracking,
  ): Promise<ShipmentRecord>;
  markShipped(
    principal: Principal,
    orderId: string,
    trackingNumber: string,
  ): Promise<ShipmentRecord>;
  markDelivered(principal: Principal, orderId: string): Promise<ShipmentRecord>;
  markFailed(principal: Principal, orderId: string): Promise<ShipmentRecord>;
}

function mapTrackingError(error: unknown): never {
  if (error instanceof Error) {
    throw new ValidationError(error.message);
  }
  throw error;
}

function trackingOf(input: ShipmentTracking): ShipmentTracking {
  try {
    return normalizeTracking(input);
  } catch (error) {
    mapTrackingError(error);
  }
}

async function emitShipment(
  deps: {
    notify?: NotificationServices;
    lookupRecipient?: (orderId: string) => Promise<DeliveryOrderContact | null>;
  },
  shipment: ShipmentRecord,
  event: NotificationEvent,
): Promise<void> {
  if (!deps.notify || !deps.lookupRecipient) {
    return;
  }
  try {
    const contact = await deps.lookupRecipient(shipment.orderId);
    if (!contact || contact.email.trim().length === 0) {
      return;
    }
    const payload: Record<string, string | number> = {
      name: contact.name,
      number: contact.number,
    };
    if (shipment.trackingNumber) {
      payload.tracking = shipment.trackingNumber;
    }
    await deps.notify.dispatch({
      event,
      entityType: "order",
      entityId: shipment.orderId,
      recipientEmail: contact.email,
      payload,
    });
  } catch {
    // Isolation: shipment rows are already committed.
  }
}

export function createDeliveryServices(deps: {
  methods: DeliveryRepository;
  shipments: ShipmentRepository;
  clock?: Clock;
  notify?: NotificationServices;
  lookupRecipient?: (orderId: string) => Promise<DeliveryOrderContact | null>;
}): DeliveryServices {
  const now = () => (deps.clock ?? { now: () => new Date() }).now();

  async function loadShipment(orderId: string): Promise<ShipmentRecord> {
    const shipment = await deps.shipments.findByOrder(orderId);
    if (!shipment) {
      throw new NotFoundError("shipment not found", { orderId });
    }
    return shipment;
  }

  return {
    async quote(methodCode, destination, options = { subtotalMinor: null }) {
      const method = await deps.methods.getMethod(methodCode);
      if (!method) {
        return null;
      }
      const zones = await deps.methods.listZones(methodCode);
      return quoteMethod(method, zones, destination, options);
    },

    async listQuotes(destination, options = { subtotalMinor: null }) {
      const methods = await deps.methods.listActiveMethods();
      const quotes: DeliveryQuote[] = [];
      for (const method of methods) {
        const zones = await deps.methods.listZones(method.code);
        const quote = quoteMethod(method, zones, destination, options);
        if (quote) {
          quotes.push(quote);
        }
      }
      return quotes;
    },

    async listMethods(principal) {
      requireOrderManagementRole(principal);
      return deps.methods.listMethods();
    },

    async getShipment(principal, orderId) {
      requireOrderManagementRole(principal);
      return loadShipment(orderId);
    },

    async getShipmentForOrder(principal, order) {
      assertCanReadOrder(principal, order.userId, order.id);
      return deps.shipments.findByOrder(order.id);
    },

    async assignShipment(principal, input) {
      requireOrderManagementRole(principal);
      if (!Number.isInteger(input.costMinor) || input.costMinor < 0) {
        throw new ValidationError("costMinor must be a non-negative integer");
      }
      const method = await deps.methods.getMethod(input.methodCode);
      if (!method) {
        throw new NotFoundError("delivery method not found", {
          methodCode: input.methodCode,
        });
      }
      const existing = await deps.shipments.findByOrder(input.orderId);
      if (existing) {
        throw new ConflictError("order already has a shipment", {
          orderId: input.orderId,
        });
      }
      const assigned = await deps.shipments.save({
        id: crypto.randomUUID(),
        orderId: input.orderId,
        methodCode: input.methodCode,
        costMinor: input.costMinor,
        status: "ASSIGNED",
        ...emptyTracking(),
      });
      await emitShipment(deps, assigned, "order.processing");
      return assigned;
    },

    async updateTracking(principal, orderId, tracking) {
      requireOrderManagementRole(principal);
      const shipment = await loadShipment(orderId);
      return deps.shipments.save({
        ...shipment,
        ...trackingOf(tracking),
      });
    },

    async markShipped(principal, orderId, trackingNumber) {
      requireOrderManagementRole(principal);
      const shipment = await loadShipment(orderId);
      const tracking = trackingOf({
        ...shipment,
        trackingNumber,
      });
      if (tracking.trackingNumber === null) {
        throw new ValidationError("trackingNumber is required");
      }
      try {
        const shipped = await deps.shipments.save({
          ...shipment,
          ...tracking,
          status: nextShipmentStatus(shipment.status, "ship"),
          shippedAt: shipment.shippedAt ?? now(),
        });
        await emitShipment(deps, shipped, "order.shipped");
        return shipped;
      } catch (error) {
        if (error instanceof ConflictError) {
          throw error;
        }
        throw new ConflictError("shipment cannot be marked shipped", { orderId });
      }
    },

    async markDelivered(principal, orderId) {
      requireOrderManagementRole(principal);
      const shipment = await loadShipment(orderId);
      try {
        const delivered = await deps.shipments.save({
          ...shipment,
          status: nextShipmentStatus(shipment.status, "deliver"),
          deliveredAt: shipment.deliveredAt ?? now(),
        });
        await emitShipment(deps, delivered, "order.delivered");
        return delivered;
      } catch (error) {
        if (error instanceof ConflictError) {
          throw error;
        }
        throw new ConflictError("shipment cannot be marked delivered", { orderId });
      }
    },

    async markFailed(principal, orderId) {
      requireOrderManagementRole(principal);
      const shipment = await loadShipment(orderId);
      try {
        return deps.shipments.save({
          ...shipment,
          status: nextShipmentStatus(shipment.status, "fail"),
        });
      } catch {
        throw new ConflictError("shipment cannot be marked failed", { orderId });
      }
    },
  };
}
