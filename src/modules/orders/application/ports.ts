import type { Cart } from "@/modules/cart";
import type { Product } from "@/modules/catalog";
import type { FulfillmentStatus, Order, OrderLine, PaymentStatus } from "../domain/order";

export interface Clock {
  now(): Date;
}

export interface OrderRepository {
  nextSequence(day: Date): Promise<number>;
  save(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  listByUser(userId: string): Promise<Order[]>;
}

export interface OrderCart {
  getCartById(cartId: string): Promise<Cart | null>;
  clear(cartId: string): Promise<void>;
}

export interface OrderCatalog {
  getProductForVariant(variantId: string): Promise<Product | null>;
}

export interface OrderInventory {
  getAvailable(variantId: string): Promise<number>;
  reserveForOrder(input: {
    variantId: string;
    quantity: number;
    orderId: string;
  }): Promise<void>;
  hasActiveForOrder(orderId: string): Promise<boolean>;
  confirmForOrder(orderId: string): Promise<void>;
  cancelForOrder(orderId: string): Promise<void>;
  commitForOrder(orderId: string): Promise<void>;
}

export interface OrderPayments {
  cancelOpenForOrder(orderId: string): Promise<void>;
}

export interface OrderDelivery {
  quote(input: {
    methodCode: string;
    destination: { region: string; city: string };
    itemCount: number;
    subtotalMinor: number;
  }): Promise<{ costMinor: number; methodName: string } | null>;
}

export interface PlaceOrderInput {
  cartId: string;
  actorUserId: string | null;
  guestToken?: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  destination: {
    recipientName: string;
    phone: string;
    region: string;
    city: string;
    street: string;
    postalCode: string;
  };
  deliveryMethodCode: string;
  paymentMethodCode: string;
}

export type { OrderLine, PaymentStatus, FulfillmentStatus };
