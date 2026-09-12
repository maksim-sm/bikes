import { DEMO_CUSTOMER_ID } from "@/modules/identity";
import type { Address, CustomerProfile } from "@/modules/identity";
import type { Order } from "@/modules/orders";
import type { ShipmentRecord } from "@/modules/delivery";

export const DEMO_ORDER_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";

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
