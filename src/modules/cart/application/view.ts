import type { Currency } from "@/modules/pricing";
import type { CartVariantOption } from "./ports";

export type CartLineIssue = "variant_missing" | "unavailable" | "insufficient_available";

export interface CartLineView {
  variantId: string;
  productId: string | null;
  productSlug: string | null;
  productName: string | null;
  brandName: string | null;
  frameSize: string | null;
  color: string | null;
  wheelSize: string | null;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  available: number;
  purchasable: boolean;
  issues: CartLineIssue[];
  alternatives: CartVariantOption[];
}

export interface CartView {
  id: string;
  items: CartLineView[];
  subtotalMinor: number;
  currency: Currency;
}
