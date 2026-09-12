import type { Product, ProductVariant } from "@/modules/catalog";

/** Public list row. Internal status and timestamps stay on the service. */
export interface ProductListDto {
  slug: string;
  name: string;
  brandName: string;
  categorySlug: string;
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
  color: string;
  listPriceMinor: number;
  currency: "BYN";
}

export function toProductListDto(product: Product): ProductListDto {
  return {
    slug: product.slug,
    name: product.name,
    brandName: product.brandName,
    categorySlug: product.categorySlug,
  };
}

export function toProductVariantDto(variant: ProductVariant): ProductVariantDto {
  return {
    id: variant.id,
    sku: variant.sku,
    frameSize: variant.frameSize,
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
