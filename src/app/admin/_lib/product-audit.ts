import type { Product } from "@/modules/catalog";

export function productAuditSnapshot(product: Product) {
  return {
    slug: product.slug,
    status: product.status,
    prices: product.variants.map((variant) => ({
      sku: variant.sku,
      listPriceMinor: variant.listPriceMinor,
    })),
  };
}

export function pricesChanged(
  before: ReturnType<typeof productAuditSnapshot>,
  after: ReturnType<typeof productAuditSnapshot>,
): boolean {
  return JSON.stringify(before.prices) !== JSON.stringify(after.prices);
}
