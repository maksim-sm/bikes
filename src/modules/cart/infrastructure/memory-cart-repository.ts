import { NotFoundError } from "@/lib/errors";
import type { Cart, CartActor } from "../domain/cart";
import type { CartRepository } from "../application/ports";

function actorKey(actor: CartActor): string {
  return actor.kind === "guest" ? `guest:${actor.guestToken}` : `user:${actor.userId}`;
}

function cartKey(cart: Cart): string {
  return cart.userId ? `user:${cart.userId}` : `guest:${cart.guestToken}`;
}

function serializeByKey<T>(
  tails: Map<string, Promise<unknown>>,
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  tails.set(key, next);
  return next;
}

export function createMemoryCartRepository(): CartRepository {
  const carts = new Map<string, Cart>();
  const tails = new Map<string, Promise<unknown>>();
  let seq = 0;
  return {
    async findByActor(actor) {
      return carts.get(actorKey(actor)) ?? null;
    },
    async findById(id) {
      return [...carts.values()].find((cart) => cart.id === id) ?? null;
    },
    async create(actor) {
      seq += 1;
      const cart: Cart = {
        id: `cart-${seq}`,
        userId: actor.kind === "customer" ? actor.userId : null,
        guestToken: actor.kind === "guest" ? actor.guestToken : null,
        items: [],
      };
      carts.set(actorKey(actor), cart);
      return cart;
    },
    async save(cart) {
      for (const [key, existing] of carts) {
        if (existing.id === cart.id && key !== cartKey(cart)) {
          carts.delete(key);
        }
      }
      carts.set(cartKey(cart), cart);
      return cart;
    },
    async clear(id) {
      const cart = [...carts.values()].find((item) => item.id === id);
      if (!cart) {
        throw new NotFoundError("cart not found", { cartId: id });
      }
      cart.items = [];
      carts.set(cartKey(cart), cart);
    },
    async claimForCheckout(id) {
      return serializeByKey(tails, id, async () => {
        const cart = [...carts.values()].find((item) => item.id === id);
        if (!cart) {
          return null;
        }
        const items = cart.items.map((item) => ({ ...item }));
        cart.items = [];
        carts.set(cartKey(cart), cart);
        return { ...cart, items };
      });
    },
    async restoreItems(id, items) {
      return serializeByKey(tails, id, async () => {
        const cart = [...carts.values()].find((item) => item.id === id);
        if (!cart) {
          throw new NotFoundError("cart not found", { cartId: id });
        }
        cart.items = items.map((item) => ({ ...item }));
        carts.set(cartKey(cart), cart);
      });
    },
    async delete(cart) {
      for (const [key, existing] of carts) {
        if (existing.id === cart.id) {
          carts.delete(key);
        }
      }
    },
    async transferToCustomer(cartId, userId) {
      const found = [...carts.entries()].find(([, cart]) => cart.id === cartId);
      if (!found) {
        throw new NotFoundError("cart not found", { cartId });
      }
      carts.delete(found[0]);
      const next: Cart = { ...found[1], userId, guestToken: null };
      carts.set(`user:${userId}`, next);
      return next;
    },
  };
}
