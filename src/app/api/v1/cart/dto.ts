import { createPricingServices } from "@/modules/pricing";
import type { CartLineView, CartView } from "@/modules/cart";

export function toLineDto(line: CartLineView) {
  return {
    variantId: line.variantId,
    productSlug: line.productSlug,
    productName: line.productName,
    brandName: line.brandName,
    frameSize: line.frameSize,
    color: line.color,
    wheelSize: line.wheelSize,
    quantity: line.quantity,
    unitPriceMinor: line.unitPriceMinor,
    lineTotalMinor: line.lineTotalMinor,
    available: line.available,
    purchasable: line.purchasable,
    issues: line.issues,
    alternatives: line.alternatives.map((option) => ({
      variantId: option.variantId,
      frameSize: option.frameSize,
      color: option.color,
      wheelSize: option.wheelSize,
      listPriceMinor: option.listPriceMinor,
      available: option.available,
      purchasable: option.purchasable,
    })),
  };
}

export function toCartDto(view: CartView) {
  return {
    id: view.id,
    currency: view.currency,
    subtotalMinor: view.subtotalMinor,
    items: view.items.map(toLineDto),
  };
}

export function emptyCartDto() {
  return toCartDto({
    id: "",
    items: [],
    subtotalMinor: 0,
    currency: createPricingServices().currency(),
  });
}
