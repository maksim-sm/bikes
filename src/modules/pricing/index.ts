/**
 * pricing module — public entry point.
 *
 * Owns displayed-price arithmetic (VAT, discounts, currency later).
 * Money is integer kopeks. Callers never compute totals with floats.
 */

export {
  BYN,
  lineTotalMinor,
  orderTotalMinor,
  sumMinor,
  type Currency,
} from "./domain/money";
export { createPricingServices, type PricingServices } from "./application/services";
