import { describe, expect, it } from "vitest";
import {
  actorOwnsCart,
  addToLine,
  mergeCartItems,
  nextLineQuantity,
  replaceLineVariant,
  type Cart,
} from "./cart";

function cart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: "c1",
    userId: null,
    guestToken: "guest-1",
    items: [],
    ...overrides,
  };
}

describe("cart line quantity", () => {
  it("caps a merge at ten but refuses an add that would exceed the cap", () => {
    expect(nextLineQuantity(8, 2)).toBe(10);
    expect(() => nextLineQuantity(9, 2)).toThrow("quantity_too_large");
    expect(() => addToLine([{ variantId: "v1", quantity: 9 }], "v1", 2)).toThrow(
      "quantity_too_large",
    );
    expect(
      mergeCartItems(
        [{ variantId: "v1", quantity: 9 }],
        [{ variantId: "v1", quantity: 2 }],
      ),
    ).toEqual([{ variantId: "v1", quantity: 10 }]);
  });
});

describe("cart ownership", () => {
  it("lets a guest own only an anonymous cart with the same token", () => {
    const guest = { kind: "guest" as const, guestToken: "guest-1" };
    expect(actorOwnsCart(cart(), guest)).toBe(true);
    expect(actorOwnsCart(cart({ guestToken: "other" }), guest)).toBe(false);
    expect(actorOwnsCart(cart({ userId: "user-1" }), guest)).toBe(false);
  });

  it("lets a customer own only a signed-in cart with no guest token", () => {
    const customer = { kind: "customer" as const, userId: "user-1" };
    expect(actorOwnsCart(cart({ userId: "user-1", guestToken: null }), customer)).toBe(
      true,
    );
    expect(actorOwnsCart(cart({ userId: "user-2", guestToken: null }), customer)).toBe(
      false,
    );
    expect(
      actorOwnsCart(cart({ userId: "user-1", guestToken: "guest-1" }), customer),
    ).toBe(false);
  });
});

describe("replace line variant", () => {
  it("throws when the source line is missing and copies when the id is unchanged", () => {
    expect(() =>
      replaceLineVariant([{ variantId: "v1", quantity: 1 }], "v2", "v3"),
    ).toThrow("line_not_found");
    const items = [{ variantId: "v1", quantity: 2 }];
    expect(replaceLineVariant(items, "v1", "v1")).toEqual(items);
    expect(replaceLineVariant(items, "v1", "v1")).not.toBe(items);
  });
});
