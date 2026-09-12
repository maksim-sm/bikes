import { ConflictError, NotFoundError } from "@/lib/errors";
import { requireOrderManagementRole, type Principal } from "@/modules/identity";
import {
  nextShipmentStatus,
  quoteMethod,
  type DeliveryQuote,
  type Destination,
} from "../domain/quote";
import type { DeliveryRepository, ShipmentRecord, ShipmentRepository } from "./ports";

export interface DeliveryServices {
  quote(methodCode: string, destination: Destination): Promise<DeliveryQuote | null>;
  listQuotes(destination: Destination): Promise<DeliveryQuote[]>;
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
    async quote(methodCode, destination) {
      const method = await deps.methods.getMethod(methodCode);
      if (!method) {
        return null;
      }
      const zones = await deps.methods.listZones(methodCode);
      return quoteMethod(method, zones, destination);
    },

    async listQuotes(destination) {
      const methods = await deps.methods.listActiveMethods();
      const quotes: DeliveryQuote[] = [];
      for (const method of methods) {
        const zones = await deps.methods.listZones(method.code);
        const quote = quoteMethod(method, zones, destination);
        if (quote) {
          quotes.push(quote);
        }
      }
      return quotes;
    },

    async assignShipment(principal, input) {
      requireOrderManagementRole(principal);
      const existing = await deps.shipments.findByOrder(input.orderId);
      if (existing) {
        throw new ConflictError("order already has a shipment", {
          orderId: input.orderId,
        });
      }
      return deps.shipments.save({
        id: `ship-${input.orderId}`,
        orderId: input.orderId,
        methodCode: input.methodCode,
        costMinor: input.costMinor,
        status: "ASSIGNED",
        trackingNumber: null,
      });
    },

    async markShipped(principal, orderId, trackingNumber) {
      requireOrderManagementRole(principal);
      const shipment = await loadShipment(orderId);
      try {
        return deps.shipments.save({
          ...shipment,
          status: nextShipmentStatus(shipment.status, "ship"),
          trackingNumber,
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
