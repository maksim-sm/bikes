import { env } from "@/lib/config";
import { ru } from "./messages/ru";
import type { Messages } from "./messages/ru";

/**
 * Locale resolution and message access.
 *
 * Russian is the only locale and the fallback (ADR-0009). There is
 * deliberately no locale negotiation, no routing segment, and no translation
 * tooling: those are the speculative parts. The parts that are expensive to
 * retrofit — strings living outside components, and formatting going through
 * `Intl` — are here from the start.
 */
const catalogues = { ru } as const;

export type Locale = keyof typeof catalogues;

export const defaultLocale: Locale = "ru";

export function getMessages(locale: Locale = env.APP_LOCALE): Messages {
  return catalogues[locale];
}

/** Shorthand for the current locale's catalogue. */
export const t: Messages = getMessages();

/**
 * Formats an amount given in minor units (kopeks) as Belarusian rubles.
 *
 * Money is integer minor units everywhere in the codebase (ADR-0010); this is
 * the only place it becomes a display string.
 */
export function formatPrice(amountMinor: number, locale: Locale = defaultLocale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BYN",
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function formatDate(date: Date, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export type { Messages };
