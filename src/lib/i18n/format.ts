import { interpolate } from "./interpolate";
import { defaultLocale, metaFor, type Locale } from "./locale";

export interface DateFormatOptions {
  withTimeZone?: boolean;
  timeZoneLabel?: string;
}

function dateOptions(
  locale: Locale,
  extras: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  const meta = metaFor(locale);
  return { timeZone: meta.timeZone, ...extras };
}

/**
 * Formats integer kopeks as BYN. Domain code never builds a money string
 * (ADR-0010). `ru-BY` so the ruble sign and grouping match Belarus.
 */
export function formatPrice(amountMinor: number, locale: Locale = defaultLocale): string {
  const meta = metaFor(locale);
  return new Intl.NumberFormat(meta.bcp47, {
    style: "currency",
    currency: meta.currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function formatNumber(value: number, locale: Locale = defaultLocale): string {
  return new Intl.NumberFormat(metaFor(locale).bcp47).format(value);
}

export function formatDate(date: Date, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(
    metaFor(locale).bcp47,
    dateOptions(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  ).format(date);
}

export function formatTime(date: Date, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(
    metaFor(locale).bcp47,
    dateOptions(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  ).format(date);
}

export function formatDateTime(
  date: Date,
  locale: Locale = defaultLocale,
  options: DateFormatOptions = {},
): string {
  const formatted = new Intl.DateTimeFormat(
    metaFor(locale).bcp47,
    dateOptions(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  ).format(date);
  if (!options.withTimeZone) {
    return formatted;
  }
  const zone = options.timeZoneLabel ?? metaFor(locale).timeZone;
  return interpolate("{datetime} ({zone})", { datetime: formatted, zone });
}

export function formatTimeZone(locale: Locale = defaultLocale): string {
  return metaFor(locale).timeZone;
}
