import { afterEach, describe, expect, it } from "vitest";
import {
  createDemoCatalogInventory,
  createDemoCatalogRepository,
} from "@/modules/catalog";
import { createCapturingMailer, createMemoryAuthServices } from "@/modules/identity";
import { POST as register } from "./register/route";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { POST as verify } from "./email/verify/route";
import { GET as getSession } from "../session/route";
import { GET as getCart } from "../cart/route";
import {
  getCartServices,
  resetRepositories,
  setAuthServices,
  setCatalogInventory,
  setCatalogRepository,
} from "../../_lib/compose";

const origin = "http://localhost:3000";

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  resetRepositories();
});

describe("auth HTTP", () => {
  it("sets an httpOnly session cookie and never returns the raw token", async () => {
    const mailer = createCapturingMailer();
    const auth = await createMemoryAuthServices({ mailer });
    setAuthServices(auth);

    const created = await register(
      jsonRequest("/api/v1/auth/register", {
        email: "ira@example.by",
        password: "correct-horse",
      }),
    );
    const createdBody = (await created.json()) as {
      data: { verificationRequired: boolean };
    };
    expect(created.status).toBe(201);
    expect(createdBody.data.verificationRequired).toBe(true);
    expect(JSON.stringify(createdBody)).not.toContain(mailer.verifications[0]!.rawToken);

    await verify(
      jsonRequest("/api/v1/auth/email/verify", {
        token: mailer.verifications[0]!.rawToken,
      }),
    );

    const loggedIn = await login(
      jsonRequest("/api/v1/auth/login", {
        email: "ira@example.by",
        password: "correct-horse",
      }),
    );
    const setCookie = loggedIn.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("bikes_session=");
    const loginBody = (await loggedIn.json()) as { data: Record<string, unknown> };
    expect(loginBody.data.type).toBe("customer");
    expect(loginBody.data).toHaveProperty("userId");
    expect(JSON.stringify(loginBody)).not.toContain("bikes_session=");

    const sessionCookie = setCookie.split(";")[0]!;
    const session = await getSession(
      new Request("http://localhost/api/v1/session", {
        headers: { cookie: sessionCookie },
      }),
    );
    expect(await session.json()).toMatchObject({
      ok: true,
      data: { type: "customer" },
    });

    const loggedOut = await logout(
      new Request("http://localhost/api/v1/auth/logout", {
        method: "POST",
        headers: { origin, cookie: sessionCookie },
      }),
    );
    expect(loggedOut.headers.get("set-cookie") ?? "").toContain("Max-Age=0");
  });

  it("merges the guest cart into the customer cart on login", async () => {
    const mailer = createCapturingMailer();
    const auth = await createMemoryAuthServices({ mailer });
    setAuthServices(auth);
    setCatalogRepository(createDemoCatalogRepository());
    setCatalogInventory(createDemoCatalogInventory());

    await register(
      jsonRequest("/api/v1/auth/register", {
        email: "cart@example.by",
        password: "correct-horse",
      }),
    );
    await verify(
      jsonRequest("/api/v1/auth/email/verify", {
        token: mailer.verifications[0]!.rawToken,
      }),
    );

    const guestToken = "11111111-1111-4111-8111-111111111111";
    await (
      await getCartServices()
    ).addItem({ kind: "guest", guestToken }, "v-emonda-m-black", 2);

    const loggedIn = await login(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          cookie: `bikes_guest=${guestToken}`,
        },
        body: JSON.stringify({
          email: "cart@example.by",
          password: "correct-horse",
        }),
      }),
    );
    const cookies = loggedIn.headers.getSetCookie();
    expect(cookies.some((value) => value.startsWith("bikes_session="))).toBe(true);
    expect(
      cookies.some(
        (value) => value.includes("bikes_guest=") && value.includes("Max-Age=0"),
      ),
    ).toBe(true);
    const sessionCookie = cookies
      .find((value) => value.startsWith("bikes_session="))
      ?.split(";")[0];
    expect(sessionCookie).toBeTruthy();

    const cartResponse = await getCart(
      new Request("http://localhost/api/v1/cart", {
        headers: { cookie: sessionCookie ?? "" },
      }),
    );
    const cartBody = (await cartResponse.json()) as {
      data: {
        subtotalMinor: number;
        items: Array<{ variantId: string; quantity: number; lineTotalMinor: number }>;
      };
    };
    expect(cartBody.data.items).toEqual([
      expect.objectContaining({
        variantId: "v-emonda-m-black",
        quantity: 2,
        unitPriceMinor: 349900,
        lineTotalMinor: 699800,
      }),
    ]);
    expect(cartBody.data.subtotalMinor).toBe(699800);
    expect(JSON.stringify(cartBody)).not.toContain(guestToken);
  });
});
