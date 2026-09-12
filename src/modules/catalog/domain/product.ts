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

export interface ProductImage {
  key: string;
  alt: string;
  role: "PRIMARY" | "GALLERY";
  sortOrder: number;
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
  modelYear: number | null;
  warrantyMonths: number | null;
  warrantyText: string | null;
  images: ProductImage[];
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

export const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ProductWriteVariant {
  id?: string;
  sku: string;
  frameSize: string;
  wheelSize: string;
  color: string;
  listPriceMinor: number;
  isActive?: boolean;
}

export interface ProductWriteInput {
  slug: string;
  name: string;
  description: string;
  brandSlug: string;
  categorySlug: string;
  bicycleType: BicycleType;
  frameMaterial: string | null;
  groupset: string | null;
  brakeType: string | null;
  modelYear: number | null;
  warrantyMonths: number | null;
  warrantyText: string | null;
  variants: readonly ProductWriteVariant[];
}

function requireText(value: string, code: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(code);
  }
  return trimmed;
}

export function normalizeProductSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function assertRequiredProduct(input: ProductWriteInput): void {
  requireText(input.name, "product_name_required");
  requireText(input.description, "product_description_required");
  const slug = normalizeProductSlug(input.slug);
  if (!PRODUCT_SLUG_PATTERN.test(slug)) {
    throw new Error("product_slug_invalid");
  }
  requireText(input.brandSlug, "product_brand_required");
  requireText(input.categorySlug, "product_category_required");
  if (!isBicycleType(input.bicycleType)) {
    throw new Error("product_type_invalid");
  }
  if (input.variants.length === 0) {
    throw new Error("product_variant_required");
  }
  for (const variant of input.variants) {
    requireText(variant.sku, "product_sku_required");
    requireText(variant.frameSize, "product_frame_size_required");
    requireText(variant.wheelSize, "product_wheel_size_required");
    requireText(variant.color, "product_color_required");
    if (!Number.isInteger(variant.listPriceMinor) || variant.listPriceMinor <= 0) {
      throw new Error("product_price_invalid");
    }
  }
}

export function hasActiveVariant(product: {
  variants: readonly ProductVariant[];
}): boolean {
  return product.variants.some((variant) => variant.isActive);
}

export function publishProduct(product: Product, now: Date): Product {
  assertRequiredProduct({
    slug: product.slug,
    name: product.name,
    description: product.description,
    brandSlug: product.brandSlug,
    categorySlug: product.categorySlug,
    bicycleType: product.bicycleType,
    frameMaterial: product.frameMaterial,
    groupset: product.groupset,
    brakeType: product.brakeType,
    modelYear: product.modelYear,
    warrantyMonths: product.warrantyMonths,
    warrantyText: product.warrantyText,
    variants: product.variants,
  });
  if (!hasActiveVariant(product)) {
    throw new Error("product_variant_required");
  }
  return {
    ...product,
    status: "PUBLISHED",
    publishedAt: now,
  };
}

export function unpublishProduct(product: Product): Product {
  if (product.status !== "PUBLISHED") {
    throw new Error("product_not_published");
  }
  return {
    ...product,
    status: "DRAFT",
  };
}
