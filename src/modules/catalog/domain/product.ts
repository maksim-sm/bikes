export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export const BICYCLE_TYPES = ["ROAD", "MTB", "GRAVEL", "CITY", "KIDS"] as const;
export type BicycleType = (typeof BICYCLE_TYPES)[number];

export const VARIANT_STATUSES = ["active", "inactive"] as const;
export type VariantStatus = (typeof VARIANT_STATUSES)[number];

export interface ProductImage {
  key: string;
  alt: string;
  role: "PRIMARY" | "GALLERY";
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  frameSize: string;
  wheelSize: string;
  color: string;
  listPriceMinor: number;
  currency: "BYN";
  status: VariantStatus;
  isActive: boolean;
  images: ProductImage[];
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

export function isVariantStatus(value: string): value is VariantStatus {
  return (VARIANT_STATUSES as readonly string[]).includes(value);
}

export function resolveVariantStatus(input: {
  status?: string;
  isActive?: boolean;
}): VariantStatus {
  if (input.status !== undefined) {
    if (!isVariantStatus(input.status)) {
      throw new Error("variant_status_invalid");
    }
    return input.status;
  }
  return input.isActive === false ? "inactive" : "active";
}

export function isSellableVariant(variant: ProductVariant): boolean {
  return variant.status === "active";
}

export function findActiveVariant(
  product: Product,
  variantId: string,
): ProductVariant | null {
  const variant = product.variants.find((item) => item.id === variantId);
  if (!variant || !isSellableVariant(variant)) {
    return null;
  }
  return variant;
}

export function isBicycleType(value: string): value is BicycleType {
  return (BICYCLE_TYPES as readonly string[]).includes(value);
}

export function lowestListPriceMinor(product: Product): number | null {
  const prices = product.variants
    .filter(isSellableVariant)
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
  barcode?: string | null;
  frameSize: string;
  wheelSize: string;
  color: string;
  listPriceMinor: number;
  status?: VariantStatus;
  isActive?: boolean;
  images?: readonly ProductImage[];
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
  images?: readonly ProductImage[];
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

export function normalizeVariantSku(sku: string): string {
  return sku.trim();
}

export function normalizeVariantBarcode(
  barcode: string | null | undefined,
): string | null {
  if (barcode === undefined || barcode === null) {
    return null;
  }
  const trimmed = barcode.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function variantCombinationKey(variant: {
  frameSize: string;
  color: string;
  wheelSize: string;
}): string {
  return [
    variant.frameSize.trim().toLowerCase(),
    variant.color.trim().toLowerCase(),
    variant.wheelSize.trim().toLowerCase(),
  ].join("\0");
}

function assertUniqueVariants(variants: readonly ProductWriteVariant[]): void {
  const skus = new Set<string>();
  const combinations = new Set<string>();
  const barcodes = new Set<string>();
  for (const variant of variants) {
    const sku = normalizeVariantSku(variant.sku).toLowerCase();
    if (skus.has(sku)) {
      throw new Error("variant_sku_duplicate");
    }
    skus.add(sku);
    const combination = variantCombinationKey(variant);
    if (combinations.has(combination)) {
      throw new Error("variant_combination_duplicate");
    }
    combinations.add(combination);
    const barcode = normalizeVariantBarcode(variant.barcode);
    if (barcode !== null) {
      const key = barcode.toLowerCase();
      if (barcodes.has(key)) {
        throw new Error("variant_barcode_duplicate");
      }
      barcodes.add(key);
    }
  }
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
    if (variant.status !== undefined) {
      resolveVariantStatus({ status: variant.status });
    }
    assertImages(variant.images ?? [], "variant_media_key_invalid");
  }
  assertImages(input.images ?? [], "product_media_key_invalid");
  assertUniqueVariants(input.variants);
}

function assertImages(images: readonly ProductImage[], emptyKeyCode: string): void {
  for (const image of images) {
    if (image.key.trim().length === 0) {
      throw new Error(emptyKeyCode);
    }
    if (image.alt.trim().length === 0) {
      throw new Error("product_image_alt_required");
    }
  }
}

export function normalizeImages(images: readonly ProductImage[]): ProductImage[] {
  return images.map((image, index) => ({
    key: image.key.trim(),
    alt: image.alt.trim(),
    role: index === 0 ? "PRIMARY" : image.role === "PRIMARY" ? "GALLERY" : image.role,
    sortOrder: index,
  }));
}

export function toWrittenVariant(
  productId: string,
  input: ProductWriteVariant,
  id: string,
): ProductVariant {
  const status = resolveVariantStatus(input);
  const images = normalizeImages(input.images ?? []);
  return {
    id,
    productId,
    sku: normalizeVariantSku(input.sku),
    barcode: normalizeVariantBarcode(input.barcode),
    frameSize: input.frameSize.trim(),
    wheelSize: input.wheelSize.trim(),
    color: input.color.trim(),
    listPriceMinor: input.listPriceMinor,
    currency: "BYN",
    status,
    isActive: status === "active",
    images,
  };
}

export function hasActiveVariant(product: {
  variants: readonly ProductVariant[];
}): boolean {
  return product.variants.some(isSellableVariant);
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
    images: product.images,
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
