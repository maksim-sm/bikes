import {
  getCatalogInventory,
  getCatalogServices,
  getDeliveryServices,
} from "@/app/api/_lib/compose";
import { mediaSrc } from "@/modules/media";
import type { DeliveryQuote } from "@/modules/delivery";
import type { BicycleType, Product } from "@/modules/catalog";

export interface ProductPageVariant {
  id: string;
  sku: string;
  frameSize: string;
  wheelSize: string;
  color: string;
  listPriceMinor: number;
  available: number;
}

export interface ProductPageImage {
  src: string;
  alt: string;
  role: "PRIMARY" | "GALLERY";
}

export interface ProductPageModel {
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
    variants: product.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        frameSize: variant.frameSize,
        wheelSize: variant.wheelSize,
        color: variant.color,
        listPriceMinor: variant.listPriceMinor,
        available: stock.get(variant.id) ?? 0,
      })),
    quotes,
  };
}

export async function loadProductPage(slug: string): Promise<ProductPageModel> {
  const catalog = await getCatalogServices();
  const product = await catalog.getProductBySlug(slug);
  const inventory = await getCatalogInventory();
  const variantIds = product.variants
    .filter((variant) => variant.isActive)
    .map((item) => item.id);
  const stockRows = await inventory.listAvailabilityByVariantIds(variantIds);
  const stock = new Map(stockRows.map((row) => [row.variantId, row.available]));
  const quotes = await getDeliveryServices().listQuotes({
    region: "Минск",
    city: "Минск",
  });
  return toPageModel(product, stock, quotes);
}
