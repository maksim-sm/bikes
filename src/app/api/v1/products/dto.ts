import {
  lowestListPriceMinor,
  type Product,
  type ProductVariant,
} from "@/modules/catalog";

/** Public list row. Internal status and timestamps stay on the service. */
export interface ProductListDto {
  slug: string;
  name: string;
  brandName: string;
  brandSlug: string;
  categorySlug: string;
  bicycleType: Product["bicycleType"];
  frameMaterial: string | null;
  groupset: string | null;
  brakeType: string | null;
  priceFromMinor: number | null;
  priceToMinor: number | null;
  frameSizes: string[];
  wheelSizes: string[];
}

/** Public detail. Variants are sellable snapshots, not inventory rows. */
export interface ProductDetailDto extends ProductListDto {
  description: string;
  variants: ProductVariantDto[];
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  frameSize: string;
  wheelSize: string;
  color: string;
  listPriceMinor: number;
  currency: "BYN";
}

export function toProductListDto(product: Product): ProductListDto {
  const active = product.variants.filter((variant) => variant.isActive);
  const prices = active.map((variant) => variant.listPriceMinor);
  return {
    slug: product.slug,
    name: product.name,
    brandName: product.brandName,
    brandSlug: product.brandSlug,
    categorySlug: product.categorySlug,
    bicycleType: product.bicycleType,
    frameMaterial: product.frameMaterial,
    groupset: product.groupset,
    brakeType: product.brakeType,
    priceFromMinor: lowestListPriceMinor(product),
    priceToMinor: prices.length === 0 ? null : Math.max(...prices),
    frameSizes: [...new Set(active.map((variant) => variant.frameSize))],
    wheelSizes: [...new Set(active.map((variant) => variant.wheelSize))],
  };
}

export function toProductVariantDto(variant: ProductVariant): ProductVariantDto {
  return {
    id: variant.id,
    sku: variant.sku,
    frameSize: variant.frameSize,
    wheelSize: variant.wheelSize,
    color: variant.color,
    listPriceMinor: variant.listPriceMinor,
    currency: variant.currency,
  };
}

export function toProductDetailDto(product: Product): ProductDetailDto {
  return {
    ...toProductListDto(product),
    description: product.description,
    variants: product.variants
      .filter((variant) => variant.isActive)
      .map(toProductVariantDto),
  };
}
