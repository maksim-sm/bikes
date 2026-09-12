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

export function mergeCartItems(
  target: readonly CartLine[],
  incoming: readonly CartLine[],
): CartLine[] {
  let items = [...target];
  for (const line of incoming) {
    const existing = items.find((item) => item.variantId === line.variantId);
    const quantity = Math.min(
      MAX_LINE_QUANTITY,
      (existing?.quantity ?? 0) + line.quantity,
    );
    items = upsertLine(items, line.variantId, quantity);
  }
  return items;
}

export function replaceLineVariant(
  items: readonly CartLine[],
  fromVariantId: string,
  toVariantId: string,
): CartLine[] {
  const from = items.find((item) => item.variantId === fromVariantId);
  if (!from) {
    throw new Error("line_not_found");
  }
  if (fromVariantId === toVariantId) {
    return [...items];
  }
  const remaining = removeLine(items, fromVariantId);
  const existing = remaining.find((item) => item.variantId === toVariantId);
  const quantity = Math.min(MAX_LINE_QUANTITY, from.quantity + (existing?.quantity ?? 0));
  return upsertLine(remaining, toVariantId, quantity);
}
