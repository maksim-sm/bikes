import type { Product } from "./product";

/** Fields that go into the stored search document (and the GIN tsvector). */
export function searchDocument(product: Product): string {
  const parts = [
    product.brandName,
    product.name,
    product.slug,
    product.frameMaterial,
    product.groupset,
    product.brakeType,
    product.description,
  ];
  for (const variant of product.variants) {
    parts.push(
      variant.sku,
      variant.barcode ?? "",
      variant.color,
      variant.frameSize,
      variant.wheelSize,
    );
  }
  return parts
    .filter((part): part is string => part !== null && part.length > 0)
    .join(" ");
}

export function productMatchesSearch(product: Product, rawQuery: string): boolean {
  const hay = searchDocument(product).toLowerCase();
  const tokens = rawQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return true;
  }
  return tokens.every((token) => hay.includes(token));
}

export function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
