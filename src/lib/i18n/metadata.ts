import type { Metadata } from "next";
import { env } from "@/lib/config";
import { interpolate } from "./interpolate";
import { defaultLocale, metaFor, type Locale } from "./locale";
import { ru, type Messages } from "./messages/ru";

export function siteMetadata(
  locale: Locale = defaultLocale,
  messages: Messages = ru,
): Metadata {
  const meta = metaFor(locale);
  return {
    metadataBase: new URL(env.APP_URL),
    title: {
      default: messages.site.name,
      template: interpolate(messages.meta.titleTemplate, { shop: messages.site.name }),
    },
    description: messages.site.description,
    openGraph: {
      locale: meta.openGraphLocale,
      siteName: messages.site.name,
      type: "website",
    },
  };
}

export function pageMetadata(title: string, description?: string): Metadata {
  return description ? { title, description } : { title };
}
