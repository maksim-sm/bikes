import { afterEach, describe, expect, it } from "vitest";
import { createCapturingMailer, createMemoryAuthServices } from "@/modules/identity";
import { POST as register } from "./register/route";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { POST as verify } from "./email/verify/route";
import { GET as getSession } from "../session/route";
import { resetRepositories, setAuthServices } from "../../_lib/compose";

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
});
