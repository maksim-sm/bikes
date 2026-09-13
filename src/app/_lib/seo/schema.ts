import { interpolate, t } from "@/lib/i18n";
import { absoluteUrl, publicOrigin } from "./urls";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function storeEntityId(): string {
  return `${publicOrigin()}/#store`;
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": storeEntityId(),
    name: t.site.name,
    description: t.site.description,
    url: absoluteUrl("/"),
    address: {
      "@type": "PostalAddress",
      streetAddress: t.delivery.pickupStreet,
      addressLocality: t.delivery.pickupCity,
      postalCode: t.delivery.pickupPostalCode,
      addressCountry: "BY",
    },
    areaServed: "BY",
    email: t.pages.contactsEmail,
    telephone: t.pages.contactsPhone,
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: t.site.name,
    url: absoluteUrl("/"),
    description: t.site.description,
    inLanguage: "ru-BY",
    publisher: { "@id": storeEntityId() },
  };
}

export function breadcrumbJsonLd(
  items: readonly BreadcrumbItem[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productJsonLd(input: {
  name: string;
  brandName: string;
  description: string;
  slug: string;
  sku: string | null;
  images: readonly { src: string; alt: string }[];
  lowPriceMinor: number;
  highPriceMinor: number;
  offerCount: number;
  currency: "BYN";
  inStock: boolean;
}): Record<string, unknown> {
  const url = absoluteUrl(`/products/${input.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    brand: { "@type": "Brand", name: input.brandName },
    url,
    ...(input.sku ? { sku: input.sku } : {}),
    image: input.images.map((image) =>
      image.src.startsWith("http") ? image.src : absoluteUrl(image.src),
    ),
    offers: {
      "@type": "AggregateOffer",
      url,
      priceCurrency: input.currency,
      lowPrice: (input.lowPriceMinor / 100).toFixed(2),
      highPrice: (input.highPriceMinor / 100).toFixed(2),
      offerCount: input.offerCount,
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}

export function catalogItemListJsonLd(
  products: readonly { slug: string; name: string; brandName: string }[],
  landing?: { name: string; description: string; path: string },
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: landing?.name ?? t.catalog.title,
    description: landing?.description ?? t.catalog.description,
    url: absoluteUrl(landing?.path ?? "/catalog"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/products/${product.slug}`),
        name: interpolate(t.meta.productTitle, {
          brand: product.brandName,
          name: product.name,
        }),
      })),
    },
  };
}

export function imageAlt(input: {
  alt: string;
  brandName: string;
  name: string;
}): string {
  const trimmed = input.alt.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return interpolate(t.product.imageFallback, {
    brand: input.brandName,
    name: input.name,
  });
}
