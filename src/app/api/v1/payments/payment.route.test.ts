import { afterEach, describe, expect, it } from "vitest";
import { assertAbuseLimit } from "@/lib/abuse";
import { GET as observeReturn } from "./[id]/route";
import { POST as startPayment } from "./route";
import { POST as webhook } from "./webhooks/route";
import {
  getAbuseLimiter,
  getMockPaymentProvider,
  getPaymentServices,
  resetRepositories,
} from "../../_lib/compose";

afterEach(() => {
  resetRepositories();
});

describe("payment return URL", () => {
  it("ignores a browser-claimed success and only syncs from the provider", async () => {
    const started = await getPaymentServices().startPayment(
      "order-return",
      "https://store.local/return",
    );
    const claimed = await observeReturn(
      new Request(
        `http://localhost/api/v1/payments/${started.paymentId}?status=succeeded&paid=1`,
      ),
    );
    expect(claimed.status).toBe(200);
    expect(await claimed.json()).toMatchObject({
      ok: true,
      data: { id: started.paymentId, status: "CREATED" },
    });

    getMockPaymentProvider().succeed(started.paymentId);
    const synced = await observeReturn(
      new Request(`http://localhost/api/v1/payments/${started.paymentId}`),
    );
    expect(await synced.json()).toMatchObject({
      ok: true,
      data: { id: started.paymentId, status: "SUCCEEDED" },
    });
  });

  it("rate-limits payment initiation and webhooks by IP", async () => {
    const limiter = getAbuseLimiter();
    for (let i = 0; i < 5; i += 1) {
      await assertAbuseLimit(limiter, "payment-start", ["local"]);
    }
    const started = await startPayment(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          orderId: "order-limited",
          returnUrl: "https://store.local/return",
        }),
      }),
    );
    expect(started.status).toBe(429);
    expect(started.headers.get("retry-after")).toBeTruthy();

    resetRepositories();
    const afterReset = getAbuseLimiter();
    for (let i = 0; i < 60; i += 1) {
      await assertAbuseLimit(afterReset, "webhook", ["local"]);
    }
    const hooked = await webhook(
      new Request("http://localhost/api/v1/payments/webhooks", {
        method: "POST",
        headers: { "content-type": "application/json", "x-mock-signature": "ok" },
        body: "{}",
      }),
    );
    expect(hooked.status).toBe(429);
  });
});
