import { DEMO_CUSTOMER_ID } from "@/modules/identity";
import type { Address, CustomerProfile } from "@/modules/identity";
import type { Order } from "@/modules/orders";
import type { ShipmentRecord } from "@/modules/delivery";
import type { PaymentAttempt } from "@/modules/payments";

export const DEMO_ORDER_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
export const DEMO_PENDING_ORDER_ID = "dddddddd-dddd-dddd-dddd-ddddddddddd2";
export const DEMO_CANCELLED_ORDER_ID = "dddddddd-dddd-dddd-dddd-ddddddddddd3";
export const DEMO_PAYMENT_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";
export const DEMO_PROVIDER_PAYMENT_ID = "mock-pay-demo-1";

export const demoCustomerProfile: CustomerProfile = {
  userId: DEMO_CUSTOMER_ID,
  firstName: "Анна",
  lastName: "Ковалева",
  phone: "+375291112233",
};

export const demoCustomerAddress: Address = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
  userId: DEMO_CUSTOMER_ID,
  label: "дом",
  recipientName: "Анна Ковалева",
  phone: "+375291112233",
  countryCode: "BY",
  region: "Минск",
  city: "Минск",
  street: "пр-т Независимости 12",
  postalCode: "220030",
  isDefault: true,
};

export const demoCustomerOrder: Order = {
  id: DEMO_ORDER_ID,
  number: "B-20260912-0001",
  userId: DEMO_CUSTOMER_ID,
  status: "PLACED",
  paymentStatus: "SUCCEEDED",
  fulfillmentStatus: "SHIPPED",
  currency: "BYN",
  subtotalMinor: 349_900,
  deliveryCostMinor: 2500,
  totalMinor: 352_400,
  deliveryMethodCode: "minsk-courier",
  deliveryMethodName: "Курьер по Минску",
  customerEmail: "customer@bikes.local",
  customerName: "Анна Ковалева",
  customerPhone: "+375291112233",
  paymentMethodCode: "cash_on_delivery",
  staffNotes: "Клиент просил позвонить за час до доставки.",
  shipping: {
    recipientName: "Анна Ковалева",
    phone: "+375291112233",
    countryCode: "BY",
    region: "Минск",
    city: "Минск",
    street: "пр-т Независимости 12",
    postalCode: "220030",
  },
  items: [
    {
      variantId: "v-emonda-m-black",
      sku: "EM-M-BLK",
      productName: "Émonda",
      brandName: "Trek",
      frameSize: "M",
      color: "чёрный",
      quantity: 1,
      unitPriceMinor: 349_900,
      lineTotalMinor: 349_900,
    },
  ],
};

export const demoCustomerShipment: ShipmentRecord = {
  id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  orderId: DEMO_ORDER_ID,
  methodCode: "minsk-courier",
  costMinor: 2500,
  status: "SHIPPED",
  carrierName: "Европочта",
  trackingNumber: "BY888",
  trackingUrl: "https://evropochta.by/track/BY888",
  shippedAt: new Date("2026-09-12T10:00:00.000Z"),
  deliveredAt: null,
  notes: null,
};

export const demoPendingOrder: Order = {
  ...demoCustomerOrder,
  id: DEMO_PENDING_ORDER_ID,
  number: "B-20260912-0002",
  status: "PLACED",
  paymentStatus: "PENDING",
  fulfillmentStatus: "UNFULFILLED",
  customerEmail: "guest@example.by",
  customerName: "Пётр Савицкий",
  customerPhone: "+375297770011",
  paymentMethodCode: "card_on_delivery",
  staffNotes: null,
  shipping: {
    ...demoCustomerOrder.shipping,
    recipientName: "Пётр Савицкий",
    phone: "+375297770011",
    street: "ул. Якуба Коласа 37",
  },
};

export const demoCancelledOrder: Order = {
  ...demoCustomerOrder,
  id: DEMO_CANCELLED_ORDER_ID,
  number: "B-20260911-0003",
  status: "CANCELLED",
  paymentStatus: "CANCELLED",
  fulfillmentStatus: "CANCELLED",
  customerEmail: "customer@bikes.local",
  customerName: "Анна Ковалева",
  staffNotes: "Отмена по просьбе клиента.",
  items: [
    {
      variantId: "v-emonda-l-red",
      sku: "EM-L-RED",
      productName: "Émonda",
      brandName: "Trek",
      frameSize: "L",
      color: "красный",
      quantity: 1,
      unitPriceMinor: 349_900,
      lineTotalMinor: 349_900,
    },
  ],
};

export const demoOrders: Order[] = [
  demoCustomerOrder,
  demoPendingOrder,
  demoCancelledOrder,
];

export const demoSucceededPayment: PaymentAttempt = {
  id: DEMO_PAYMENT_ID,
  orderId: DEMO_ORDER_ID,
  provider: "mock",
  providerPaymentId: DEMO_PROVIDER_PAYMENT_ID,
  amountMinor: 352_400,
  currency: "BYN",
  status: "SUCCEEDED",
  idempotencyKey: "pay:demo:1",
  expiresAt: null,
};
