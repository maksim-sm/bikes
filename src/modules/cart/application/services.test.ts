import { describe, expect, it } from "vitest";
import { ConflictError, ValidationError } from "@/lib/errors";
import { addToLine, assertLineQuantity, type Cart, type CartActor } from "../domain/cart";
import type { CartCatalog, CartRepository } from "./ports";
import { createCartServices } from "./services";

const actor: CartActor = { kind: "customer", userId: "user-1" };

function memoryCarts(): CartRepository {
  const carts = new Map<string, Cart>();
  return {
    async findByActor(who) {
      const key = who.kind === "guest" ? `guest:${who.guestToken}` : `user:${who.userId}`;
      return carts.get(key) ?? null;
    },
    async create(who) {
      const cart: Cart = {
        id: "cart-1",
        userId: who.kind === "customer" ? who.userId : null,
        guestToken: who.kind === "guest" ? who.guestToken : null,
        items: [],
      };
      const key = who.kind === "guest" ? `guest:${who.guestToken}` : `user:${who.userId}`;
      carts.set(key, cart);
      return cart;
    },
    async save(cart) {
      const key = cart.userId ? `user:${cart.userId}` : `guest:${cart.guestToken}`;
      carts.set(key, cart);
      return cart;
    },
  };
}

const catalog: CartCatalog = {
  async variantIsPurchasable(variantId) {
    return variantId === "v1";
  },
};

describe("cart quantity rules", () => {
  it("rejects zero and oversized lines", () => {
    expect(() => assertLineQuantity(0)).toThrow("quantity_too_small");
    expect(() => assertLineQuantity(11)).toThrow("quantity_too_large");
    expect(addToLine([], "v1", 2)).toEqual([{ variantId: "v1", quantity: 2 }]);
  });
});

describe("cart services", () => {
  it("adds and caps quantity without touching stock", async () => {
    const cart = createCartServices({ carts: memoryCarts(), catalog });
    await cart.addItem(actor, "v1", 2);
    const updated = await cart.addItem(actor, "v1", 1);
    expect(updated.items).toEqual([{ variantId: "v1", quantity: 3 }]);
    await expect(cart.addItem(actor, "v1", 10)).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses inactive catalogue variants", async () => {
    const cart = createCartServices({ carts: memoryCarts(), catalog });
    await expect(cart.addItem(actor, "missing", 1)).rejects.toBeInstanceOf(ConflictError);
  });
});
