import { afterEach, describe, expect, it } from "vitest";
import { createMemoryCatalogRepository, type Product } from "@/modules/catalog";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getSession } from "@/app/api/v1/session/route";
import { GET as getProducts } from "@/app/api/v1/products/route";
import { GET as getOrder } from "@/app/api/v1/orders/[id]/route";
import { resetRepositories, setCatalogRepository } from "./compose";

const published: Product = {
  id: "p1",
  slug: "emonda",
  name: "Émonda",
  description: "x",
  status: "PUBLISHED",
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  brandName: "Trek",
  brandSlug: "trek",
  categorySlug: "road",
  bicycleType: "ROAD",
  frameMaterial: null,
  groupset: null,
  brakeType: null,
  modelYear: null,
  warrantyMonths: null,
  warrantyText: null,
  images: [],
  variants: [
    {
      id: "v1",
      productId: "p1",
      sku: "EM-M",
      barcode: null,
      frameSize: "M",
      wheelSize: "28",
      color: "чёрный",
      listPriceMinor: 349900,
      currency: "BYN",
      status: "active",
      isActive: true,
      images: [],
    },
  ],
};

afterEach(() => {
  resetRepositories();
});

describe("route handler conventions", () => {
  it("returns the envelope and echoes x-request-id on health", async () => {
    const response = await getHealth(
      new Request("http://localhost/api/health", {
        headers: { "x-request-id": "rid-health" },
      }),
    );
    expect(response.headers.get("x-request-id")).toBe("rid-health");
    const body = (await response.json()) as {
      ok: boolean;
      requestId: string;
      data: { status: string };
    };
    expect(body).toMatchObject({
      ok: true,
      requestId: "rid-health",
      data: { status: "ok" },
    });
  });

  it("resolves anonymous and authenticated principals", async () => {
    const anon = await getSession(new Request("http://localhost/api/v1/session"));
    expect(await anon.json()).toMatchObject({ ok: true, data: { type: "anonymous" } });
  });

  it("lists products through DTOs", async () => {
    setCatalogRepository(createMemoryCatalogRepository({ products: [published] }));
    const response = await getProducts(new Request("http://localhost/api/v1/products"));
    const body = (await response.json()) as {
      data: Array<Record<string, unknown>>;
      meta: { total: number };
    };
    expect(body.data[0]).toMatchObject({
      slug: "emonda",
      name: "Émonda",
      brandName: "Trek",
      brandSlug: "trek",
      categorySlug: "road",
      bicycleType: "ROAD",
    });
    expect(body.meta.total).toBe(1);
  });

  it("requires authentication for orders", async () => {
    const unauthenticated = await getOrder(
      new Request("http://localhost/api/v1/orders/o1"),
    );
    expect(unauthenticated.status).toBe(401);
    const body = (await unauthenticated.json()) as {
      ok: boolean;
      error: { code: string };
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("unauthenticated");
  });
});
