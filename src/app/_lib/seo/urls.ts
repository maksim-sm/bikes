import { env } from "@/lib/config";

export function publicOrigin(): string {
  return new URL(env.APP_URL).origin;
}

/** Absolute storefront URL. `path` is root-relative (`/catalog`). */
export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, `${publicOrigin()}/`).href;
}

export function productPath(slug: string): string {
  return `/products/${slug}`;
}
