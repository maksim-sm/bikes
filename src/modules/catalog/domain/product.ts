export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  frameSize: string;
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
  categorySlug: string;
  variants: ProductVariant[];
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
