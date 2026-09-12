import { afterEach, describe, expect, it } from "vitest";
import { createCapturingMailer, createMemoryAuthServices } from "@/modules/identity";
import { createMemoryOrderRepository, type Order } from "@/modules/orders";
import { PATCH as patchProfile } from "./customers/[userId]/profile/route";
import { GET as listOrders } from "./orders/route";
import { GET as getShipment } from "./orders/[id]/shipment/route";
import { POST as register } from "./auth/register/route";
import { POST as login } from "./auth/login/route";
import { POST as verify } from "./auth/email/verify/route";
import { POST as changePassword } from "./auth/password/change/route";
import {
  getCustomerServices,
  getDeliveryServices,
  resetRepositories,
  setAuthServices,
  setOrderRepository,
} from "../_lib/compose";

const origin = "http://localhost:3000";

function jsonRequest(
  path: string,
  body: unknown,
  cookie?: string,
  method = "POST",
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      origin,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function registerAndLogin(
  email: string,
  mailer: ReturnType<typeof createCapturingMailer>,
): Promise<{ userId: string; cookie: string }> {
  await register(
    jsonRequest("/api/v1/auth/register", { email, password: "correct-horse" }),
  );
  const token = mailer.verifications.at(-1)?.rawToken;
  await verify(jsonRequest("/api/v1/auth/email/verify", { token }));
  const loggedIn = await login(
    jsonRequest("/api/v1/auth/login", { email, password: "correct-horse" }),
  );
  const body = (await loggedIn.json()) as { data: { userId: string } };
  const setCookie = loggedIn.headers.get("set-cookie") ?? "";
  return { userId: body.data.userId, cookie: setCookie.split(";")[0]! };
}

afterEach(() => {
  resetRepositories();
});

describe("customer account HTTP", () => {
  it("lets a customer update a profile, list own orders, and read shipment tracking", async () => {
    const mailer = createCapturingMailer();
    const auth = await createMemoryAuthServices({ mailer });
    setAuthServices(auth);
    const owner = await registerAndLogin("owner@example.by", mailer);
    const stranger = await registerAndLogin("stranger@example.by", mailer);

    const patched = await patchProfile(
      jsonRequest(
        `/api/v1/customers/${owner.userId}/profile`,
        { firstName: "Иван", lastName: "Иванов", phone: "+375291112233" },
        owner.cookie,
        "PATCH",
      ),
    );
    expect(patched.status).toBe(200);
    const profile = await getCustomerServices().getProfile(
      { type: "customer", userId: owner.userId },
      owner.userId,
    );
    expect(profile.firstName).toBe("Иван");

    const order: Order = {
      id: "order-owned",
      number: "B-20260912-0099",
      userId: owner.userId,
      status: "PLACED",
      paymentStatus: "SUCCEEDED",
      fulfillmentStatus: "SHIPPED",
      currency: "BYN",
      subtotalMinor: 1000,
      deliveryCostMinor: 0,
      totalMinor: 1000,
      deliveryMethodCode: "minsk-courier",
      deliveryMethodName: "Курьер по Минску",
      customerEmail: "owner@example.by",
      customerName: "Иван",
      customerPhone: "+375291112233",
      paymentMethodCode: "cash_on_delivery",
      staffNotes: null,
      shipping: {
        recipientName: "Иван",
        phone: "+375291112233",
        countryCode: "BY",
        region: "Минск",
        city: "Минск",
        street: "1",
        postalCode: "220000",
      },
      items: [],
    };
    setOrderRepository(createMemoryOrderRepository([order]));
    const ops = {
      type: "staff" as const,
      userId: "ops",
      roles: ["order_management" as const],
    };
    await getDeliveryServices().assignShipment(ops, {
      orderId: order.id,
      methodCode: "minsk-courier",
      costMinor: 2500,
    });
    await getDeliveryServices().markShipped(ops, order.id, "BY777");

    const listed = await listOrders(
      new Request("http://localhost/api/v1/orders", {
        headers: { cookie: owner.cookie },
      }),
    );
    const listedBody = (await listed.json()) as {
      data: { orders: Array<{ id: string; paymentStatus: string }> };
    };
    expect(listed.status).toBe(200);
    expect(listedBody.data.orders).toEqual([
      expect.objectContaining({ id: order.id, paymentStatus: "SUCCEEDED" }),
    ]);

    const strangerList = await listOrders(
      new Request("http://localhost/api/v1/orders", {
        headers: { cookie: stranger.cookie },
      }),
    );
    const strangerBody = (await strangerList.json()) as { data: { orders: unknown[] } };
    expect(strangerBody.data.orders).toEqual([]);

    const shipment = await getShipment(
      new Request(`http://localhost/api/v1/orders/${order.id}/shipment`, {
        headers: { cookie: owner.cookie },
      }),
    );
    const shipmentBody = (await shipment.json()) as {
      data: { shipment: { trackingNumber: string | null; notes?: unknown } };
    };
    expect(shipment.status).toBe(200);
    expect(shipmentBody.data.shipment.trackingNumber).toBe("BY777");
    expect(shipmentBody.data.shipment).not.toHaveProperty("notes");

    const forbidden = await getShipment(
      new Request(`http://localhost/api/v1/orders/${order.id}/shipment`, {
        headers: { cookie: stranger.cookie },
      }),
    );
    expect(forbidden.status).toBe(403);

    const changed = await changePassword(
      jsonRequest(
        "/api/v1/auth/password/change",
        { currentPassword: "correct-horse", password: "new-correct" },
        owner.cookie,
      ),
    );
    expect(changed.status).toBe(200);
    expect(changed.headers.get("set-cookie")).toContain("bikes_session=");
  });
});
