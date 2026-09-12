import { t } from "@/lib/i18n";

export function paymentMethodLabel(code: string): string {
  if (code === "card_on_delivery") {
    return t.checkout.paymentCard;
  }
  if (code === "bank_transfer") {
    return t.checkout.paymentTransfer;
  }
  return t.checkout.paymentCash;
}
