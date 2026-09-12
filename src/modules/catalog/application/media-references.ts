import type { MediaReferences } from "@/modules/media";
import type { CatalogRepository } from "./ports";

export function catalogMediaReferences(catalog: CatalogRepository): MediaReferences {
  return {
    async isReferenced(key) {
      const products = await catalog.listAll();
      return products.some(
        (product) =>
          product.images.some((image) => image.key === key) ||
          product.variants.some((variant) =>
            variant.images.some((image) => image.key === key),
          ),
      );
    },
  };
}

export function imageKeysOf(product: {
  images: ReadonlyArray<{ key: string }>;
  variants: ReadonlyArray<{ images: ReadonlyArray<{ key: string }> }>;
}): Set<string> {
  const keys = new Set<string>();
  for (const image of product.images) {
    keys.add(image.key);
  }
  for (const variant of product.variants) {
    for (const image of variant.images) {
      keys.add(image.key);
    }
  }
  return keys;
}
