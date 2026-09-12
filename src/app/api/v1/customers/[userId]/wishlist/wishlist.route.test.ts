import { afterEach, describe, expect, it } from "vitest";
import { createCapturingMailer, createMemoryAuthServices } from "@/modules/identity";
import { DELETE, GET, POST } from "./route";
import { POST as register } from "../../../auth/register/route";
import { POST as login } from "../../../auth/login/route";
import { POST as verify } from "../../../auth/email/verify/route";
import {
  resetRepositories,
  setAuthServices,
  setWishlistCatalog,
  setWishlistStock,
} from "../../../../_lib/compose";

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

describe("wishlist HTTP", () => {
  it("adds a product once, shows the view, and removes it", async () => {
    const mailer = createCapturingMailer();
    setAuthServices(await createMemoryAuthServices({ mailer }));
    setWishlistCatalog({
      async getProduct(productId) {
        if (productId !== "p-emonda") {
          return null;
        }
        return {
          id: "p-emonda",
          slug: "emonda",
          name: "Émonda SL 5",
          brandName: "Trek",
          listed: true,
          listPriceMinor: 450_000,
          variantIds: ["v-emonda-m-black"],
          image: null,
        };
      },
    });
    setWishlistStock({
      async anyInStock() {
        return true;
      },
    });

    const owner = await registerAndLogin("owner@example.by", mailer);
    const path = `/api/v1/customers/${owner.userId}/wishlist`;

    const created = await POST(
      jsonRequest(path, { productId: "p-emonda" }, owner.cookie),
    );
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as {
      data: { productIds: string[]; items: Array<{ productId: string }> };
    };
    expect(createdBody.data.productIds).toEqual(["p-emonda"]);
    expect(createdBody.data.items).toHaveLength(1);

    const duplicate = await POST(
      jsonRequest(path, { productId: "p-emonda" }, owner.cookie),
    );
    expect(duplicate.status).toBe(409);

    const listed = await GET(
      new Request(`http://localhost${path}`, { headers: { cookie: owner.cookie } }),
    );
    expect(listed.status).toBe(200);
    const listedBody = (await listed.json()) as {
      data: { items: Array<{ issues: string[]; savedPriceMinor: number }> };
    };
    expect(listedBody.data.items[0]?.savedPriceMinor).toBe(450_000);
    expect(listedBody.data.items[0]?.issues).toEqual([]);

    const removed = await DELETE(
      jsonRequest(path, { productId: "p-emonda" }, owner.cookie, "DELETE"),
    );
    expect(removed.status).toBe(200);
    const removedBody = (await removed.json()) as { data: { productIds: string[] } };
    expect(removedBody.data.productIds).toEqual([]);
  });
});
