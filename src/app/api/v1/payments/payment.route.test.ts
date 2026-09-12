import { afterEach, describe, expect, it } from "vitest";
import { GET as observeReturn } from "./[id]/route";
import {
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
});
