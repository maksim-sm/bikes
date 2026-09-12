import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireOrderManagementRole, type Principal } from "@/modules/identity";
import {
  nextShipmentStatus,
  quoteMethod,
  type DeliveryMethodRecord,
  type DeliveryQuote,
  type Destination,
  type QuoteOptions,
} from "../domain/quote";
import type { DeliveryRepository, ShipmentRecord, ShipmentRepository } from "./ports";

export interface DeliveryServices {
  quote(
    methodCode: string,
    destination: Destination,
    options?: QuoteOptions,
  ): Promise<DeliveryQuote | null>;
  listQuotes(destination: Destination, options?: QuoteOptions): Promise<DeliveryQuote[]>;
  listMethods(principal: Principal): Promise<DeliveryMethodRecord[]>;
  getShipment(principal: Principal, orderId: string): Promise<ShipmentRecord>;
  assignShipment(
    principal: Principal,
    input: {
      orderId: string;
      methodCode: string;
      costMinor: number;
    },
  ): Promise<ShipmentRecord>;
  markShipped(
    principal: Principal,
    orderId: string,
    trackingNumber: string,
  ): Promise<ShipmentRecord>;
  markDelivered(principal: Principal, orderId: string): Promise<ShipmentRecord>;
  markFailed(principal: Principal, orderId: string): Promise<ShipmentRecord>;
}

export function createDeliveryServices(deps: {
  methods: DeliveryRepository;
  shipments: ShipmentRepository;
}): DeliveryServices {
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
      return deps.shipments.save({
        id: crypto.randomUUID(),
        orderId: input.orderId,
        methodCode: input.methodCode,
        costMinor: input.costMinor,
        status: "ASSIGNED",
        trackingNumber: null,
      });
    },

    async markShipped(principal, orderId, trackingNumber) {
      requireOrderManagementRole(principal);
      const tracking = trackingNumber.trim();
      if (tracking.length === 0) {
        throw new ValidationError("trackingNumber is required");
      }
      const shipment = await loadShipment(orderId);
      try {
        return deps.shipments.save({
          ...shipment,
          status: nextShipmentStatus(shipment.status, "ship"),
          trackingNumber: tracking,
        });
      } catch {
        throw new ConflictError("shipment cannot be marked shipped", { orderId });
      }
    },

    async markDelivered(principal, orderId) {
      requireOrderManagementRole(principal);
      const shipment = await loadShipment(orderId);
      try {
        return deps.shipments.save({
          ...shipment,
          status: nextShipmentStatus(shipment.status, "deliver"),
        });
      } catch {
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
