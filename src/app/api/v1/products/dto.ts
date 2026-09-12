import {
  isSellableVariant,
  lowestListPriceMinor,
  type Product,
  type ProductVariant,
} from "@/modules/catalog";
import { mediaSrc } from "@/modules/media";

export { mediaSrc };

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
export interface ProductImageDto {
  src: string;
  alt: string;
  role: "PRIMARY" | "GALLERY";
}

export interface ProductDetailDto extends ProductListDto {
  description: string;
  modelYear: number | null;
  warrantyMonths: number | null;
  warrantyText: string | null;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  barcode: string | null;
  frameSize: string;
  wheelSize: string;
  color: string;
  listPriceMinor: number;
  currency: "BYN";
  images: ProductImageDto[];
}

export function toProductListDto(product: Product): ProductListDto {
  const active = product.variants.filter(isSellableVariant);
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
    barcode: variant.barcode,
    frameSize: variant.frameSize,
    wheelSize: variant.wheelSize,
    color: variant.color,
    listPriceMinor: variant.listPriceMinor,
    currency: variant.currency,
    images: [...variant.images]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((image) => ({
        src: mediaSrc(image.key),
        alt: image.alt,
        role: image.role,
      })),
  };
}

export function toProductDetailDto(product: Product): ProductDetailDto {
  return {
    ...toProductListDto(product),
    description: product.description,
    modelYear: product.modelYear,
    warrantyMonths: product.warrantyMonths,
    warrantyText: product.warrantyText,
    images: [...product.images]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((image) => ({
        src: mediaSrc(image.key),
        alt: image.alt,
        role: image.role,
      })),
    variants: product.variants.filter(isSellableVariant).map(toProductVariantDto),
  };
}
