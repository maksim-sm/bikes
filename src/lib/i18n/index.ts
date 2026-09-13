import { env } from "@/lib/config";
import { formatDateTime as formatDateTimeRaw } from "./format";
import { ru } from "./messages/ru";
import type { Messages } from "./messages/ru";
import { defaultLocale, resolveLocale, type Locale } from "./locale";

/**
 * Locale resolution and message access.
 *
 * Russian is the only shipped locale and the fallback (ADR-0009, ADR-0033).
 * There is no locale routing segment yet. Adding a language is a catalogue
 * plus a `localeMeta` row — not a hunt through components.
 */
const catalogues = { ru } as const satisfies Record<Locale, Messages>;

export function getMessages(locale: Locale = resolveLocale(env.APP_LOCALE)): Messages {
  return catalogues[locale] ?? catalogues.ru;
}

/** Shorthand for the current locale's catalogue. */
export const t: Messages = getMessages();

export { interpolate } from "./interpolate";
export {
  formatDate,
  formatNumber,
  formatPrice,
  formatTime,
  formatTimeZone,
} from "./format";

export function formatDateTime(
  date: Date,
  locale: Locale = defaultLocale,
  options?: { withTimeZone?: boolean; timeZoneLabel?: string },
): string {
  return formatDateTimeRaw(date, locale, options);
}

/** Customer-facing instant in the shop timezone (Europe/Minsk), with a zone label. */
export function formatStoreDateTime(
  date: Date,
  locale: Locale = resolveLocale(env.APP_LOCALE),
): string {
  return formatDateTimeRaw(date, locale, {
    withTimeZone: true,
    timeZoneLabel: getMessages(locale).time.zoneMinsk,
  });
}
export { formatPlural, pluralCategory } from "./plural";
export {
  defaultLocale,
  isLocale,
  localeMeta,
  metaFor,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "./locale";
export type { Locale, LocaleMeta } from "./locale";
export { notificationCopy, productPageTitle, systemMessage } from "./copy";
export type { NotificationCode, SystemErrorCode } from "./copy";
export { emailActionUrl, emailHtml, renderEmail } from "./email";
export type { EmailKind, RenderedEmail } from "./email";
export { zodIssueMessage } from "./zod-messages";
export type { Messages };
