export const MIN_LINE_QUANTITY = 1;
export const MAX_LINE_QUANTITY = 10;

export type CartActor =
  | { kind: "guest"; guestToken: string }
  | { kind: "customer"; userId: string };

export interface CartLine {
  variantId: string;
  quantity: number;
}

export interface Cart {
  id: string;
  userId: string | null;
  guestToken: string | null;
  items: CartLine[];
}

export function assertLineQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < MIN_LINE_QUANTITY) {
    throw new Error("quantity_too_small");
  }
  if (quantity > MAX_LINE_QUANTITY) {
    throw new Error("quantity_too_large");
  }
}

export function nextLineQuantity(current: number, delta: number): number {
  const next = current + delta;
  assertLineQuantity(next);
  return next;
}

export function replaceLineQuantity(quantity: number): number {
  assertLineQuantity(quantity);
  return quantity;
}

export function actorOwnsCart(cart: Cart, actor: CartActor): boolean {
  if (actor.kind === "guest") {
    return cart.guestToken === actor.guestToken && cart.userId === null;
  }
  return cart.userId === actor.userId && cart.guestToken === null;
}

export function upsertLine(
  items: readonly CartLine[],
  variantId: string,
  quantity: number,
): CartLine[] {
  assertLineQuantity(quantity);
  const existing = items.find((item) => item.variantId === variantId);
  if (!existing) {
    return [...items, { variantId, quantity }];
  }
  return items.map((item) =>
    item.variantId === variantId ? { ...item, quantity } : item,
  );
}

export function addToLine(
  items: readonly CartLine[],
  variantId: string,
  addQuantity: number,
): CartLine[] {
  const existing = items.find((item) => item.variantId === variantId);
  const quantity = nextLineQuantity(existing?.quantity ?? 0, addQuantity);
  return upsertLine(items, variantId, quantity);
}

export function removeLine(items: readonly CartLine[], variantId: string): CartLine[] {
  return items.filter((item) => item.variantId !== variantId);
}
