import { afterEach, describe, expect, it } from "vitest";
import {
  createDemoCatalogInventory,
  createDemoCatalogRepository,
} from "@/modules/catalog";
import {
  createInventoryServices,
  createMemoryInventoryRepository,
} from "@/modules/inventory";
import { POST as addCartItem } from "../cart/items/route";
import { POST as checkout } from "./route";
import { GET as listQuotes } from "../delivery/quotes/route";
import {
  resetRepositories,
  setCatalogInventory,
  setCatalogRepository,
  setInventoryServices,
} from "../../_lib/compose";

const origin = "http://localhost:3000";

const DEMO_STOCK = [
  { id: "inv-emonda-m-black", variantId: "v-emonda-m-black", onHand: 4, reserved: 0 },
  { id: "inv-emonda-l-black", variantId: "v-emonda-l-black", onHand: 2, reserved: 0 },
  { id: "inv-emonda-m-red", variantId: "v-emonda-m-red", onHand: 0, reserved: 0 },
  { id: "inv-emonda-l-red", variantId: "v-emonda-l-red", onHand: 1, reserved: 0 },
];

function seedDemoCommerce(): void {
  setCatalogRepository(createDemoCatalogRepository());
  setCatalogInventory(createDemoCatalogInventory());
  setInventoryServices(
    createInventoryServices({
      inventory: createMemoryInventoryRepository(DEMO_STOCK),
      clock: { now: () => new Date() },
    }),
  );
}

function jsonRequest(path: string, body: unknown, cookie?: string): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  resetRepositories();
});

describe("checkout HTTP", () => {
  it("ignores a client-supplied total and charges catalogue price plus the server quote", async () => {
    seedDemoCommerce();

    const added = await addCartItem(
      jsonRequest("/api/v1/cart/items", {
        variantId: "v-emonda-m-black",
        quantity: 2,
      }),
    );
    expect(added.status).toBe(200);
    const guestCookie = (added.headers.get("set-cookie") ?? "").split(";")[0]!;
    expect(guestCookie).toContain("bikes_guest=");

    const placed = await checkout(
      jsonRequest(
        "/api/v1/checkout",
        {
          customerEmail: "ira@example.by",
          customerName: "Ира",
          customerPhone: "+375291112233",
          destination: {
            recipientName: "Ира",
            phone: "+375291112233",
            region: "Минск",
            city: "Минск",
            street: "Независимости 1",
            postalCode: "220000",
          },
          deliveryMethodCode: "minsk-courier",
          paymentMethodCode: "cash_on_delivery",
          totalMinor: 1,
          subtotalMinor: 1,
          deliveryCostMinor: 1,
          unitPriceMinor: 1,
          cartId: "forged-cart",
        },
        guestCookie,
      ),
    );
    const body = (await placed.json()) as {
      ok: boolean;
      data: {
        totalMinor: number;
        subtotalMinor: number;
        deliveryCostMinor: number;
        items: Array<{ unitPriceMinor: number; quantity: number }>;
      };
    };

    expect(placed.status).toBe(201);
    expect(body.data.subtotalMinor).toBe(699800);
    expect(body.data.deliveryCostMinor).toBe(2500);
    expect(body.data.totalMinor).toBe(702300);
    expect(body.data.totalMinor).not.toBe(1);
    expect(body.data.items[0]).toMatchObject({
      unitPriceMinor: 349900,
      quantity: 2,
    });
  });

  it("rejects an empty cart and invalid customer data", async () => {
    seedDemoCommerce();

    const empty = await checkout(
      jsonRequest("/api/v1/checkout", {
        customerEmail: "ira@example.by",
        customerName: "Ира",
        customerPhone: "+375291112233",
        destination: {
          recipientName: "Ира",
          phone: "+375291112233",
          region: "Минск",
          city: "Минск",
          street: "Независимости 1",
          postalCode: "220000",
        },
        deliveryMethodCode: "minsk-courier",
        paymentMethodCode: "cash_on_delivery",
      }),
    );
    expect(empty.status).toBe(400);

    const added = await addCartItem(
      jsonRequest("/api/v1/cart/items", {
        variantId: "v-emonda-m-black",
        quantity: 1,
      }),
    );
    const guestCookie = (added.headers.get("set-cookie") ?? "").split(";")[0]!;
    const invalid = await checkout(
      jsonRequest(
        "/api/v1/checkout",
        {
          customerEmail: "not-an-email",
          customerName: "Ира",
          customerPhone: "+375291112233",
          destination: {
            recipientName: "Ира",
            phone: "+375291112233",
            region: "Минск",
            city: "Минск",
            street: "Независимости 1",
            postalCode: "220000",
          },
          deliveryMethodCode: "minsk-courier",
          paymentMethodCode: "cash_on_delivery",
        },
        guestCookie,
      ),
    );
    expect(invalid.status).toBe(400);
  });

  it("quotes pickup at zero and still ignores a client total", async () => {
    seedDemoCommerce();
    const added = await addCartItem(
      jsonRequest("/api/v1/cart/items", {
        variantId: "v-emonda-l-red",
        quantity: 1,
      }),
    );
    const guestCookie = (added.headers.get("set-cookie") ?? "").split(";")[0]!;
    const placed = await checkout(
      jsonRequest(
        "/api/v1/checkout",
        {
          customerEmail: "ira@example.by",
          customerName: "Ира",
          customerPhone: "+375291112233",
          destination: {
            recipientName: "Ира",
            phone: "+375291112233",
            region: "Минск",
            city: "Минск",
            street: "ignored-by-quote",
            postalCode: "000000",
          },
          deliveryMethodCode: "minsk-pickup",
          paymentMethodCode: "card_on_delivery",
          totalMinor: 1,
        },
        guestCookie,
      ),
    );
    const body = (await placed.json()) as {
      data: { totalMinor: number; deliveryCostMinor: number; deliveryMethodCode: string };
    };
    expect(placed.status).toBe(201);
    expect(body.data.deliveryMethodCode).toBe("minsk-pickup");
    expect(body.data.deliveryCostMinor).toBe(0);
    expect(body.data.totalMinor).toBe(359900);
  });

  it("quotes delivery from the server, not the browser", async () => {
    const quoted = await listQuotes(
      new Request(
        "http://localhost/api/v1/delivery/quotes?region=%D0%9C%D0%B8%D0%BD%D1%81%D0%BA&city=%D0%9C%D0%B8%D0%BD%D1%81%D0%BA",
      ),
    );
    const body = (await quoted.json()) as {
      data: { quotes: Array<{ methodCode: string; costMinor: number }> };
    };
    expect(quoted.status).toBe(200);
    expect(body.data.quotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          methodCode: "minsk-courier",
          costMinor: 2500,
          kind: "courier",
        }),
        expect.objectContaining({
          methodCode: "minsk-pickup",
          costMinor: 0,
          kind: "pickup",
        }),
      ]),
    );
  });
});
