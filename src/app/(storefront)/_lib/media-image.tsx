export const MEDIA_PLACEHOLDER_WIDTH = 1200;
export const MEDIA_PLACEHOLDER_HEIGHT = 800;

export function mediaImageAttrs(input: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
}): {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  decoding: "sync" | "async";
  loading: "eager" | "lazy";
  fetchPriority: "high" | "low";
} {
  return {
    src: input.src,
    alt: input.alt,
    width: input.width ?? MEDIA_PLACEHOLDER_WIDTH,
    height: input.height ?? MEDIA_PLACEHOLDER_HEIGHT,
    sizes: input.sizes ?? "(min-width: 768px) 36rem, 100vw",
    decoding: input.priority ? "sync" : "async",
    loading: input.priority ? "eager" : "lazy",
    fetchPriority: input.priority ? "high" : "low",
  };
}

interface MediaImageProps {
  src: string;
  alt: string;
  /** First meaningful image on the page (LCP). */
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Bytes come from `/api/media` as stored objects or SVG placeholders.
 * We do not send keys through the Next optimizer (opaque media keys, ADR-0007).
 * Width/height still reserve layout so catalog and product images do not shift.
 */
export function MediaImage({
  src,
  alt,
  priority = false,
  sizes,
  width,
  height,
  className,
}: MediaImageProps) {
  const attrs = mediaImageAttrs({
    src,
    alt,
    ...(priority ? { priority: true } : {}),
    ...(sizes ? { sizes } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  });
  return (
    // eslint-disable-next-line @next/next/no-img-element -- opaque media keys, not static files
    <img className={className} {...attrs} />
  );
}
