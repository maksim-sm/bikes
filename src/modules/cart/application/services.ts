import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import type { PricingServices } from "@/modules/pricing";
import {
  MAX_LINE_QUANTITY,
  actorOwnsCart,
  addToLine,
  mergeCartItems,
  removeLine,
  replaceLineQuantity,
  upsertLine,
  type Cart,
  type CartActor,
} from "../domain/cart";
import type { CartCatalog, CartRepository, CartVariantSnapshot } from "./ports";
import type { CartLineIssue, CartLineView, CartView } from "./view";

export interface CartServices {
  getCart(actor: CartActor): Promise<Cart>;
  getCartView(actor: CartActor): Promise<CartView>;
  addItem(actor: CartActor, variantId: string, quantity: number): Promise<Cart>;
  setItemQuantity(actor: CartActor, variantId: string, quantity: number): Promise<Cart>;
  replaceItemVariant(
    actor: CartActor,
    fromVariantId: string,
    toVariantId: string,
  ): Promise<Cart>;
  removeItem(actor: CartActor, variantId: string): Promise<Cart>;
  mergeOnLogin(guest: CartActor, customer: CartActor): Promise<Cart>;
}

function mapQuantityError(error: unknown): never {
  if (error instanceof Error && error.message === "quantity_too_small") {
    throw new ValidationError("quantity must be at least 1");
  }
  if (error instanceof Error && error.message === "quantity_too_large") {
    throw new ValidationError("quantity exceeds the line maximum");
  }
  throw error;
}

function snapshotMap(
  snapshots: readonly CartVariantSnapshot[],
): Map<string, CartVariantSnapshot> {
  return new Map(snapshots.map((snapshot) => [snapshot.variantId, snapshot]));
}

export function createCartServices(deps: {
  carts: CartRepository;
  catalog: CartCatalog;
  pricing: PricingServices;
}): CartServices {
  async function loadOwned(actor: CartActor): Promise<Cart> {
    const cart = await deps.carts.findByActor(actor);
    if (!cart) {
      throw new NotFoundError("cart not found");
    }
    if (!actorOwnsCart(cart, actor)) {
      throw new ForbiddenError("cart does not belong to the caller");
    }
    return cart;
  }

  async function loadOrCreate(actor: CartActor): Promise<Cart> {
    const existing = await deps.carts.findByActor(actor);
    if (existing) {
      if (!actorOwnsCart(existing, actor)) {
        throw new ForbiddenError("cart does not belong to the caller");
      }
      return existing;
    }
    return deps.carts.create(actor);
  }

  async function requireHold(variantId: string, quantity: number): Promise<void> {
    const [snapshot] = await deps.catalog.getVariantSnapshots([variantId]);
    if (!snapshot || !snapshot.purchasable) {
      throw new ConflictError("variant is not purchasable", { variantId });
    }
    if (quantity > snapshot.available) {
      throw new ConflictError("insufficient available inventory", {
        variantId,
        available: snapshot.available,
      });
    }
  }

  function toLineView(
    variantId: string,
    quantity: number,
    snapshot: CartVariantSnapshot | undefined,
  ): CartLineView {
    const issues: CartLineIssue[] = [];
    if (!snapshot) {
      issues.push("variant_missing");
      return {
        variantId,
        productId: null,
        productSlug: null,
        productName: null,
        brandName: null,
        frameSize: null,
        color: null,
        wheelSize: null,
        quantity,
        unitPriceMinor: 0,
        lineTotalMinor: 0,
        available: 0,
        purchasable: false,
        issues,
        alternatives: [],
      };
    }
    if (!snapshot.purchasable) {
      issues.push("unavailable");
    }
    if (quantity > snapshot.available) {
      issues.push("insufficient_available");
    }
    return {
      variantId,
      productId: snapshot.productId,
      productSlug: snapshot.productSlug,
      productName: snapshot.productName,
      brandName: snapshot.brandName,
      frameSize: snapshot.frameSize,
      color: snapshot.color,
      wheelSize: snapshot.wheelSize,
      quantity,
      unitPriceMinor: snapshot.listPriceMinor,
      lineTotalMinor: deps.pricing.lineTotal(snapshot.listPriceMinor, quantity),
      available: snapshot.available,
      purchasable: snapshot.purchasable && quantity <= snapshot.available,
      issues,
      alternatives: snapshot.siblings,
    };
  }

  return {
    async getCart(actor) {
      return loadOrCreate(actor);
    },

    async getCartView(actor) {
      const cart = await loadOrCreate(actor);
      const snapshots = snapshotMap(
        await deps.catalog.getVariantSnapshots(cart.items.map((item) => item.variantId)),
      );
      const items = cart.items.map((item) =>
        toLineView(item.variantId, item.quantity, snapshots.get(item.variantId)),
      );
      return {
        id: cart.id,
        items,
        subtotalMinor: deps.pricing.cartSubtotal(
          items.map((item) => ({
            unitPriceMinor: item.unitPriceMinor,
            quantity: item.quantity,
          })),
        ),
        currency: deps.pricing.currency(),
      };
    },

    async addItem(actor, variantId, quantity) {
      const cart = await loadOrCreate(actor);
      const existing = cart.items.find((item) => item.variantId === variantId);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      await requireHold(variantId, nextQuantity);
      try {
        cart.items = addToLine(cart.items, variantId, quantity);
      } catch (error) {
        mapQuantityError(error);
      }
      return deps.carts.save(cart);
    },

    async setItemQuantity(actor, variantId, quantity) {
      const cart = await loadOwned(actor);
      if (!cart.items.some((item) => item.variantId === variantId)) {
        throw new NotFoundError("cart line not found", { variantId });
      }
      await requireHold(variantId, quantity);
      try {
        cart.items = upsertLine(cart.items, variantId, replaceLineQuantity(quantity));
      } catch (error) {
        mapQuantityError(error);
      }
      return deps.carts.save(cart);
    },

    async replaceItemVariant(actor, fromVariantId, toVariantId) {
      const cart = await loadOwned(actor);
      const from = cart.items.find((item) => item.variantId === fromVariantId);
      if (!from) {
        throw new NotFoundError("cart line not found", { variantId: fromVariantId });
      }
      if (fromVariantId === toVariantId) {
        return cart;
      }
      const snapshots = snapshotMap(
        await deps.catalog.getVariantSnapshots([fromVariantId, toVariantId]),
      );
      const fromSnap = snapshots.get(fromVariantId);
      const toSnap = snapshots.get(toVariantId);
      const isSibling = fromSnap?.siblings.some(
        (option) => option.variantId === toVariantId,
      );
      if (fromSnap && !isSibling) {
        throw new ValidationError("variant is not a selectable alternative", {
          fromVariantId,
          toVariantId,
        });
      }
      if (!toSnap?.purchasable) {
        throw new ConflictError("variant is not purchasable", { variantId: toVariantId });
      }
      const existingTarget = cart.items.find((item) => item.variantId === toVariantId);
      const nextQuantity = Math.min(
        MAX_LINE_QUANTITY,
        from.quantity + (existingTarget?.quantity ?? 0),
      );
      if (nextQuantity > toSnap.available) {
        throw new ConflictError("insufficient available inventory", {
          variantId: toVariantId,
          available: toSnap.available,
        });
      }
      cart.items = upsertLine(
        removeLine(cart.items, fromVariantId),
        toVariantId,
        nextQuantity,
      );
      return deps.carts.save(cart);
    },

    async removeItem(actor, variantId) {
      const cart = await loadOwned(actor);
      cart.items = removeLine(cart.items, variantId);
      return deps.carts.save(cart);
    },

    async mergeOnLogin(guest, customer) {
      if (guest.kind !== "guest" || customer.kind !== "customer") {
        throw new ValidationError("merge requires a guest cart and a customer cart");
      }
      const guestCart = await deps.carts.findByActor(guest);
      const userCart = await deps.carts.findByActor(customer);

      if (!guestCart || guestCart.items.length === 0) {
        if (guestCart) {
          await deps.carts.delete(guestCart);
        }
        return loadOrCreate(customer);
      }

      const snapshots = snapshotMap(
        await deps.catalog.getVariantSnapshots(
          guestCart.items.map((item) => item.variantId),
        ),
      );
      const incoming = guestCart.items.filter((item) => {
        const snapshot = snapshots.get(item.variantId);
        return snapshot?.purchasable === true && item.quantity <= snapshot.available;
      });

      if (!userCart) {
        guestCart.items = incoming;
        if (guestCart.items.length === 0) {
          await deps.carts.delete(guestCart);
          return loadOrCreate(customer);
        }
        return deps.carts.transferToCustomer(guestCart.id, customer.userId);
      }

      userCart.items = mergeCartItems(userCart.items, incoming);
      const saved = await deps.carts.save(userCart);
      await deps.carts.delete(guestCart);
      return saved;
    },
  };
}
