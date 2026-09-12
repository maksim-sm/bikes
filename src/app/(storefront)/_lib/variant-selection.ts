export interface SelectableVariant {
  id: string;
  frameSize: string;
  color: string;
}

export function uniqueFrameSizes(variants: readonly SelectableVariant[]): string[] {
  return [...new Set(variants.map((variant) => variant.frameSize))];
}

export function uniqueColors(variants: readonly SelectableVariant[]): string[] {
  return [...new Set(variants.map((variant) => variant.color))];
}

export function findVariant(
  variants: readonly SelectableVariant[],
  frameSize: string,
  color: string,
): SelectableVariant | null {
  return (
    variants.find(
      (variant) => variant.frameSize === frameSize && variant.color === color,
    ) ?? null
  );
}

/** Keep the current size when possible; otherwise fall back to a real variant. */
export function resolveSelection(
  variants: readonly SelectableVariant[],
  frameSize: string,
  color: string,
): SelectableVariant | null {
  const exact = findVariant(variants, frameSize, color);
  if (exact) {
    return exact;
  }
  const sameSize = variants.find((variant) => variant.frameSize === frameSize);
  if (sameSize) {
    return sameSize;
  }
  return variants[0] ?? null;
}

export function colorsForSize(
  variants: readonly SelectableVariant[],
  frameSize: string,
): string[] {
  return uniqueColors(variants.filter((variant) => variant.frameSize === frameSize));
}
