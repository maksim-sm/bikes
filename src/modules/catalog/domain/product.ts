export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export const BICYCLE_TYPES = ["ROAD", "MTB", "GRAVEL", "CITY", "KIDS"] as const;
export type BicycleType = (typeof BICYCLE_TYPES)[number];

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  frameSize: string;
  wheelSize: string;
  color: string;
  listPriceMinor: number;
  currency: "BYN";
  isActive: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProductStatus;
  publishedAt: Date | null;
  brandName: string;
  brandSlug: string;
  categorySlug: string;
  bicycleType: BicycleType;
  frameMaterial: string | null;
  groupset: string | null;
  brakeType: string | null;
  variants: ProductVariant[];
}

export interface Category {
  slug: string;
  name: string;
  parentSlug: string | null;
  sortOrder: number;
}

export interface Brand {
  slug: string;
  name: string;
}

export function isListedOnStorefront(product: Product, now: Date): boolean {
  if (product.status !== "PUBLISHED") {
    return false;
  }
  if (product.publishedAt === null) {
    return false;
  }
  return product.publishedAt.getTime() <= now.getTime();
}

export function findActiveVariant(
  product: Product,
  variantId: string,
): ProductVariant | null {
  const variant = product.variants.find((item) => item.id === variantId);
  if (!variant || !variant.isActive) {
    return null;
  }
  return variant;
}

export function isBicycleType(value: string): value is BicycleType {
  return (BICYCLE_TYPES as readonly string[]).includes(value);
}

export function lowestListPriceMinor(product: Product): number | null {
  const prices = product.variants
    .filter((variant) => variant.isActive)
    .map((variant) => variant.listPriceMinor);
  if (prices.length === 0) {
    return null;
  }
  return Math.min(...prices);
}
