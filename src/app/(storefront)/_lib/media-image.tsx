interface MediaImageProps {
  src: string;
  alt: string;
}

/** Bytes come from `/api/media` as SVG placeholders, not the Next optimizer. */
export function MediaImage({ src, alt }: MediaImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- opaque media keys, not static files
    <img src={src} alt={alt} />
  );
}
