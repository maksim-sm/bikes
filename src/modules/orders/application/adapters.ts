import { isAppError } from "@/lib/errors";
import type { CartRepository } from "@/modules/cart";
import type { CatalogRepository } from "@/modules/catalog";
import type { DeliveryServices } from "@/modules/delivery";
import type { InventoryServices } from "@/modules/inventory";
import type { OrderCart, OrderCatalog, OrderDelivery, OrderInventory } from "./ports";

export function orderCartAdapter(carts: CartRepository): OrderCart {
  return {
    async getCartById(cartId) {
      return carts.findById(cartId);
    },
    async clear(cartId) {
      await carts.clear(cartId);
    },
  };
}

export function orderCatalogAdapter(catalog: CatalogRepository): OrderCatalog {
  return {
    async getProductForVariant(variantId) {
      const products = await catalog.listAll();
      const product = products.find((item) =>
        item.variants.some((variant) => variant.id === variantId),
      );
      return product ?? null;
    },
  };
}

export function orderInventoryAdapter(inventory: InventoryServices): OrderInventory {
  return {
    async getAvailable(variantId) {
      try {
        const stock = await inventory.getAvailability(variantId);
        return stock.available;
      } catch (error) {
        if (isAppError(error) && error.code === "not_found") {
          return 0;
        }
        throw error;
      }
    },
    async reserveForOrder(input) {
      await inventory.reserve({
        variantId: input.variantId,
        quantity: input.quantity,
        orderId: input.orderId,
      });
    },
    async hasActiveForOrder(orderId) {
      return inventory.hasActiveForOrder(orderId);
    },
    async confirmForOrder(orderId) {
      await inventory.confirmForOrder(orderId);
    },
    async cancelForOrder(orderId) {
      await inventory.cancelForOrder(orderId);
    },
    async commitForOrder(orderId) {
      await inventory.commitForOrder(orderId);
    },
  };
}

export function orderDeliveryAdapter(delivery: DeliveryServices): OrderDelivery {
  return {
    async quote(input) {
      const quote = await delivery.quote(input.methodCode, input.destination);
      if (!quote) {
        return null;
      }
      return { costMinor: quote.costMinor, methodName: quote.methodName };
    },
  };
}
