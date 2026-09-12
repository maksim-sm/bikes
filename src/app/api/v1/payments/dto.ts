import type { Payment } from "@/modules/payments";

export interface PaymentDto {
  id: string;
  orderId: string;
  status: Payment["status"];
  amountMinor: number;
  currency: "BYN";
}

export function toPaymentDto(payment: Payment): PaymentDto {
  return {
    id: payment.id,
    orderId: payment.orderId,
    status: payment.status,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
  };
}
