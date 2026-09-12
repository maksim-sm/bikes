import { afterEach, describe, expect, it } from "vitest";
import { createCapturingMailer, createMemoryAuthServices } from "@/modules/identity";
import { GET as getProfile } from "./[userId]/profile/route";
import { GET as getAddresses } from "./[userId]/addresses/route";
import { GET as getWishlist } from "./[userId]/wishlist/route";
import { GET as getOrder } from "../orders/[id]/route";
import { POST as register } from "../auth/register/route";
import { POST as login } from "../auth/login/route";
import { POST as verify } from "../auth/email/verify/route";
import {
  getCustomerServices,
  resetRepositories,
  setAuthServices,
  setOrderRepository,
} from "../../_lib/compose";
import type { Order } from "@/modules/orders";

const origin = "http://localhost:3000";

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
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

describe("customer resource isolation", () => {
  it("does not let a customer read another customer's profile, address, wishlist, or order", async () => {
    const mailer = createCapturingMailer();
    const auth = await createMemoryAuthServices({ mailer });
    setAuthServices(auth);

    const owner = await registerAndLogin("owner@example.by", mailer);
    const stranger = await registerAndLogin("stranger@example.by", mailer);

    await getCustomerServices().updateProfile(
      { type: "customer", userId: owner.userId },
      owner.userId,
      { firstName: "Иван", lastName: "Иванов", phone: null },
    );
    await getCustomerServices().addAddress(
      { type: "customer", userId: owner.userId },
      owner.userId,
      {
        label: "дом",
        recipientName: "Иван",
        phone: "+37529",
        countryCode: "BY",
        region: "Минск",
        city: "Минск",
        street: "1",
        postalCode: "220000",
        isDefault: true,
      },
    );

    const order: Order = {
      id: "order-owned",
      number: "B-20260912-0001",
      userId: owner.userId,
      status: "PLACED",
      paymentStatus: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
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
    setOrderRepository({
      async nextSequence() {
        return 1;
      },
      async save(next) {
        return next;
      },
      async findById(id) {
        return id === order.id ? order : null;
      },
      async listByUser(userId) {
        return userId === order.userId ? [order] : [];
      },
    });

    const headers = { cookie: stranger.cookie };
    const profile = await getProfile(
      new Request(`http://localhost/api/v1/customers/${owner.userId}/profile`, {
        headers,
      }),
    );
    const addresses = await getAddresses(
      new Request(`http://localhost/api/v1/customers/${owner.userId}/addresses`, {
        headers,
      }),
    );
    const wishlist = await getWishlist(
      new Request(`http://localhost/api/v1/customers/${owner.userId}/wishlist`, {
        headers,
      }),
    );
    const foreignOrder = await getOrder(
      new Request(`http://localhost/api/v1/orders/${order.id}`, { headers }),
    );

    expect(profile.status).toBe(403);
    expect(addresses.status).toBe(403);
    expect(wishlist.status).toBe(403);
    expect(foreignOrder.status).toBe(403);

    const ownProfile = await getProfile(
      new Request(`http://localhost/api/v1/customers/${owner.userId}/profile`, {
        headers: { cookie: owner.cookie },
      }),
    );
    expect(ownProfile.status).toBe(200);
    const ownBody = (await ownProfile.json()) as { data: { firstName: string } };
    expect(ownBody.data.firstName).toBe("Иван");
    expect(JSON.stringify(ownBody)).not.toMatch(/password|bikes_session/i);
  });
});
