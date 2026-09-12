import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  actorOwnsCart,
  addToLine,
  removeLine,
  replaceLineQuantity,
  upsertLine,
  type Cart,
  type CartActor,
} from "../domain/cart";
import type { CartCatalog, CartRepository } from "./ports";

export interface CartServices {
  getCart(actor: CartActor): Promise<Cart>;
  addItem(actor: CartActor, variantId: string, quantity: number): Promise<Cart>;
  setItemQuantity(actor: CartActor, variantId: string, quantity: number): Promise<Cart>;
  removeItem(actor: CartActor, variantId: string): Promise<Cart>;
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

export function createCartServices(deps: {
  carts: CartRepository;
  catalog: CartCatalog;
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

  return {
    async getCart(actor) {
      return loadOrCreate(actor);
    },

    async addItem(actor, variantId, quantity) {
      if (!(await deps.catalog.variantIsPurchasable(variantId))) {
        throw new ConflictError("variant is not purchasable", { variantId });
      }
      const cart = await loadOrCreate(actor);
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
      try {
        cart.items = upsertLine(cart.items, variantId, replaceLineQuantity(quantity));
      } catch (error) {
        mapQuantityError(error);
      }
      return deps.carts.save(cart);
    },

    async removeItem(actor, variantId) {
      const cart = await loadOwned(actor);
      cart.items = removeLine(cart.items, variantId);
      return deps.carts.save(cart);
    },
  };
}
