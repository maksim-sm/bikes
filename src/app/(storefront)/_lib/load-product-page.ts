import { cache } from "react";
import {
  getCatalogInventory,
  getCatalogServices,
  getDeliveryServices,
} from "@/app/api/_lib/compose";
import { isSellableVariant } from "@/modules/catalog";
import { mediaSrc } from "@/modules/media";
import type { DeliveryQuote } from "@/modules/delivery";
import type { BicycleType, Product } from "@/modules/catalog";

export interface ProductPageVariant {
  id: string;
  sku: string;
  barcode: string | null;
  frameSize: string;
  wheelSize: string;
  color: string;
  listPriceMinor: number;
  available: number;
  images: ProductPageImage[];
}

export interface ProductPageImage {
  src: string;
  alt: string;
  role: "PRIMARY" | "GALLERY";
}

export interface ProductPageModel {
  id: string;
  slug: string;
  name: string;
  description: string;
  brandName: string;
  bicycleType: BicycleType;
  modelYear: number | null;
  frameMaterial: string | null;
  groupset: string | null;
  brakeType: string | null;
  warrantyMonths: number | null;
  warrantyText: string | null;
  images: ProductPageImage[];
  variants: ProductPageVariant[];
  quotes: DeliveryQuote[];
}

function toPageModel(
  product: Product,
  stock: ReadonlyMap<string, number>,
  quotes: DeliveryQuote[],
): ProductPageModel {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    brandName: product.brandName,
    bicycleType: product.bicycleType,
    modelYear: product.modelYear,
    frameMaterial: product.frameMaterial,
    groupset: product.groupset,
    brakeType: product.brakeType,
    warrantyMonths: product.warrantyMonths,
    warrantyText: product.warrantyText,
    images: [...product.images]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((image) => ({
        src: mediaSrc(image.key),
        alt: image.alt,
        role: image.role,
      })),
    variants: product.variants.filter(isSellableVariant).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      frameSize: variant.frameSize,
      wheelSize: variant.wheelSize,
      color: variant.color,
      listPriceMinor: variant.listPriceMinor,
      available: stock.get(variant.id) ?? 0,
      images: [...variant.images]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((image) => ({
          src: mediaSrc(image.key),
          alt: image.alt,
          role: image.role,
        })),
    })),
    quotes,
  };
}

/**
 * One product + inventory + quote read per request.
 * `generateMetadata` and the page used to each call this and triple the work.
 */
export const loadProductPage = cache(async (slug: string): Promise<ProductPageModel> => {
  const catalog = await getCatalogServices();
  const product = await catalog.getProductBySlug(slug);
  const inventory = await getCatalogInventory();
  const variantIds = product.variants.filter(isSellableVariant).map((item) => item.id);
  const stockRows = await inventory.listAvailabilityByVariantIds(variantIds);
  const stock = new Map(stockRows.map((row) => [row.variantId, row.available]));
  const quotes = await getDeliveryServices().listQuotes({
    region: "Минск",
    city: "Минск",
  });
  return toPageModel(product, stock, quotes);
});
