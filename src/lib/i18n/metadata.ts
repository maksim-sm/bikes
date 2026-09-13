import type { Metadata } from "next";
import { interpolate } from "./interpolate";
import { defaultLocale, metaFor, type Locale } from "./locale";
import { ru, type Messages } from "./messages/ru";

export { productPageTitle } from "./copy";

export function siteMetadata(
  locale: Locale = defaultLocale,
  messages: Messages = ru,
): Metadata {
  const meta = metaFor(locale);
  return {
    title: {
      default: messages.site.name,
      template: interpolate(messages.meta.titleTemplate, { shop: messages.site.name }),
    },
    description: messages.site.description,
    openGraph: {
      locale: meta.openGraphLocale,
      siteName: messages.site.name,
    },
  };
}

export function pageMetadata(title: string, description?: string): Metadata {
  return description ? { title, description } : { title };
}

export function productPageTitle(
  brandName: string,
  name: string,
  messages: Messages = ru,
): string {
  return interpolate(messages.meta.productTitle, { brand: brandName, name });
}
