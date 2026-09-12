import type { DeliveryQuote } from "@/modules/delivery";

export interface DeliveryQuoteDto {
  methodCode: string;
  methodName: string;
  costMinor: number;
  estimatedDays: number;
  estimatedText: string;
  kind: DeliveryQuote["kind"];
  pickup: DeliveryQuote["pickup"];
}

export function toDeliveryQuoteDto(quote: DeliveryQuote): DeliveryQuoteDto {
  return {
    methodCode: quote.methodCode,
    methodName: quote.methodName,
    costMinor: quote.costMinor,
    estimatedDays: quote.estimatedDays,
    estimatedText: quote.estimatedText,
    kind: quote.kind,
    pickup: quote.pickup,
  };
}
