import type { Product } from "@/modules/catalog";

export interface VariantStockLabel {
  variantId: string;
  sku: string;
  productName: string;
  frameSize: string;
  color: string;
}

export function variantStockLabels(
  products: readonly Product[],
): Map<string, VariantStockLabel> {
  const labels = new Map<string, VariantStockLabel>();
  for (const product of products) {
    for (const variant of product.variants) {
      labels.set(variant.id, {
        variantId: variant.id,
        sku: variant.sku,
        productName: product.name,
        frameSize: variant.frameSize,
        color: variant.color,
      });
    }
  }
  return labels;
}

export function labelForVariant(
  labels: Map<string, VariantStockLabel>,
  variantId: string,
): VariantStockLabel {
  return (
    labels.get(variantId) ?? {
      variantId,
      sku: variantId,
      productName: variantId,
      frameSize: "",
      color: "",
    }
  );
}

export function matchesStockQuery(label: VariantStockLabel, query: string): boolean {
  const needle = query.normalize("NFKC").trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }
  return [label.sku, label.productName, label.frameSize, label.color, label.variantId]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}
