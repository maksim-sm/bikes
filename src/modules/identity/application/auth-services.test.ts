import { describe, expect, it } from "vitest";
import { ConflictError, UnauthenticatedError, ValidationError } from "@/lib/errors";
import { createMemoryAuthServices } from "./create-auth";
import { createCapturingMailer } from "../infrastructure/logging-mailer";

describe("customer authentication", () => {
  it("registers without leaking a session and requires verification before login", async () => {
    const mailer = createCapturingMailer();
    const auth = await createMemoryAuthServices({ mailer });
    const registered = await auth.register({
      email: "ivan@example.by",
      password: "correct-horse",
      requestId: "r1",
      rateKey: "ip:1",
    });
    expect(registered).toEqual({ verificationRequired: true });
    expect(registered).not.toHaveProperty("token");
    expect(mailer.verifications).toHaveLength(1);

    await expect(
      auth.login({
        email: "ivan@example.by",
        password: "correct-horse",
        requestId: "r2",
        rateKey: "ip:1",
        secureCookie: false,
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    await auth.verifyEmail({
      rawToken: mailer.verifications[0]!.rawToken,
      requestId: "r3",
    });
    const loggedIn = await auth.login({
      email: "ivan@example.by",
      password: "correct-horse",
      requestId: "r4",
      rateKey: "ip:1",
      secureCookie: false,
    });
    expect(loggedIn.cookie.httpOnly).toBe(true);
    expect(loggedIn.cookie.sameSite).toBe("lax");
    expect(loggedIn.principal.type).toBe("customer");

    const principal = await auth.resolve(loggedIn.cookie.value);
    expect(principal).toEqual(loggedIn.principal);

    const loggedOut = await auth.logout({
      rawToken: loggedIn.cookie.value,
      requestId: "r5",
      secureCookie: false,
    });
    expect(loggedOut.cookie.maxAge).toBe(0);
    expect(await auth.resolve(loggedIn.cookie.value)).toEqual({ type: "anonymous" });
  });

  it("resists account enumeration on register, login, and reset", async () => {
    const mailer = createCapturingMailer();
    const auth = await createMemoryAuthServices({ mailer });
    await auth.register({
      email: "anna@example.by",
      password: "correct-horse",
      requestId: "r1",
      rateKey: "ip:2",
    });

    const again = await auth.register({
      email: "anna@example.by",
      password: "correct-horse",
      requestId: "r2",
      rateKey: "ip:2",
    });
    expect(again).toEqual({ verificationRequired: true });

    await expect(
      auth.login({
        email: "nobody@example.by",
        password: "wrong-password",
        requestId: "r3",
        rateKey: "ip:2",
        secureCookie: false,
      }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(
      auth.login({
        email: "anna@example.by",
        password: "wrong-password",
        requestId: "r4",
        rateKey: "ip:2",
        secureCookie: false,
      }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);

    const resetUnknown = await auth.requestPasswordReset({
      email: "nobody@example.by",
      requestId: "r5",
      rateKey: "ip:2",
    });
    const resetKnown = await auth.requestPasswordReset({
      email: "anna@example.by",
      requestId: "r6",
      rateKey: "ip:2",
    });
    expect(resetUnknown).toEqual(resetKnown);
    expect(mailer.resets).toHaveLength(1);
  });

  it("resets the password and invalidates sessions", async () => {
    const mailer = createCapturingMailer();
    const auth = await createMemoryAuthServices({ mailer });
    await auth.register({
      email: "oleg@example.by",
      password: "correct-horse",
      requestId: "r1",
      rateKey: "ip:3",
    });
    await auth.verifyEmail({
      rawToken: mailer.verifications[0]!.rawToken,
      requestId: "r2",
    });
    const session = await auth.login({
      email: "oleg@example.by",
      password: "correct-horse",
      requestId: "r3",
      rateKey: "ip:3",
      secureCookie: false,
    });

    await auth.requestPasswordReset({
      email: "oleg@example.by",
      requestId: "r4",
      rateKey: "ip:3",
    });
    await auth.resetPassword({
      rawToken: mailer.resets[0]!.rawToken,
      password: "new-correct",
      requestId: "r5",
      rateKey: "ip:3",
    });

    expect(await auth.resolve(session.cookie.value)).toEqual({ type: "anonymous" });
    await expect(
      auth.login({
        email: "oleg@example.by",
        password: "correct-horse",
        requestId: "r6",
        rateKey: "ip:3",
        secureCookie: false,
      }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
    const next = await auth.login({
      email: "oleg@example.by",
      password: "new-correct",
      requestId: "r7",
      rateKey: "ip:3",
      secureCookie: false,
    });
    expect(next.principal.type).toBe("customer");
  });

  it("rejects short passwords", async () => {
    const auth = await createMemoryAuthServices();
    await expect(
      auth.register({
        email: "short@example.by",
        password: "tiny",
        requestId: "r1",
        rateKey: "ip:4",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
