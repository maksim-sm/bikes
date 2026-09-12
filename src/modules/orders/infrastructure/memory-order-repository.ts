import type { Order } from "../domain/order";
import type { OrderRepository } from "../application/ports";

export function createMemoryOrderRepository(): OrderRepository {
  const orders = new Map<string, Order>();
  return {
    async nextSequence() {
      return orders.size + 1;
    },
    async save(order) {
      orders.set(order.id, { ...order, items: [...order.items] });
      return orders.get(order.id)!;
    },
    async findById(id) {
      const order = orders.get(id);
      return order ? { ...order, items: [...order.items] } : null;
    },
  };
}
