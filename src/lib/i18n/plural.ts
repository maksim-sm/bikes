import { formatNumber } from "./format";
import { interpolate } from "./interpolate";
import { defaultLocale, metaFor, type Locale } from "./locale";

/**
 * Russian needs three forms (one / few / many). `other` falls back to many.
 * A second locale supplies its own forms; `Intl.PluralRules` picks the key.
 */
export interface PluralForms {
  one: string;
  few: string;
  many: string;
}

export function pluralCategory(
  count: number,
  locale: Locale = defaultLocale,
): keyof PluralForms {
  const category = new Intl.PluralRules(metaFor(locale).bcp47).select(count);
  if (category === "one" || category === "few") {
    return category;
  }
  return "many";
}

export function formatPlural(
  count: number,
  forms: PluralForms,
  locale: Locale = defaultLocale,
): string {
  const template = forms[pluralCategory(count, locale)];
  return interpolate(template, { count: formatNumber(count, locale) });
}
