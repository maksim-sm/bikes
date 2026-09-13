/**
 * Shipped locales and the data a second language needs besides a catalogue.
 *
 * Adding Belarusian later is: a `be` row here, `messages/be.ts` that satisfies
 * `Messages`, and `APP_LOCALE` accepting `be`. Routing, negotiation, and a
 * language switcher stay deferred (ADR-0009 / ADR-0033).
 */
export const SUPPORTED_LOCALES = ["ru"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const defaultLocale: Locale = "ru";

export interface LocaleMeta {
  id: Locale;
  /** BCP-47 tag for `Intl` (language + region). */
  bcp47: string;
  htmlLang: string;
  openGraphLocale: string;
  currency: "BYN";
  timeZone: string;
  textDirection: "ltr";
}

export const localeMeta = {
  ru: {
    id: "ru",
    bcp47: "ru-BY",
    htmlLang: "ru",
    openGraphLocale: "ru_BY",
    currency: "BYN",
    timeZone: "Europe/Minsk",
    textDirection: "ltr",
  },
} as const satisfies Record<Locale, LocaleMeta>;

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(requested?: string | null): Locale {
  if (requested && isLocale(requested)) {
    return requested;
  }
  return defaultLocale;
}

export function metaFor(locale: Locale = defaultLocale): LocaleMeta {
  return localeMeta[locale];
}
