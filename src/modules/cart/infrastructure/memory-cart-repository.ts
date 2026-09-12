import type { Cart, CartActor } from "../domain/cart";
import type { CartRepository } from "../application/ports";

function actorKey(actor: CartActor): string {
  return actor.kind === "guest" ? `guest:${actor.guestToken}` : `user:${actor.userId}`;
}

export function createMemoryCartRepository(): CartRepository {
  const carts = new Map<string, Cart>();
  let seq = 0;
  return {
    async findByActor(actor) {
      return carts.get(actorKey(actor)) ?? null;
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
      const key = cart.userId ? `user:${cart.userId}` : `guest:${cart.guestToken}`;
      carts.set(key, cart);
      return cart;
    },
  };
}
