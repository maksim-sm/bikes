import { describe, expect, it } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  UnauthenticatedError,
  ValidationError,
} from "@/lib/errors";
import { customerPrincipal, staffPrincipal } from "../domain/principal";
import { STAFF_SESSION_IDLE_MS, STAFF_SESSION_MAX_MS } from "../domain/auth";
import { createArgon2PasswordHasher } from "../infrastructure/argon2-hasher";
import { createCapturingMailer } from "../infrastructure/logging-mailer";
import {
  createMemoryAuthTokens,
  createMemorySessions,
  createMemoryUserAccounts,
} from "../infrastructure/memory-auth-repository";
import { createMemoryRateLimiter } from "../infrastructure/memory-rate-limiter";
import { createSecurityLog } from "../infrastructure/security-log";
import { createSha256TokenDigest } from "../infrastructure/sha256-token";
import { createAuthServices } from "./auth-services";
import { createMemoryAuthServices } from "./create-auth";

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

  it("changes the password, keeps this session, and revokes the others", async () => {
    const mailer = createCapturingMailer();
    const auth = await createMemoryAuthServices({ mailer });
    await auth.register({
      email: "nina@example.by",
      password: "correct-horse",
      requestId: "r1",
      rateKey: "ip:5",
    });
    await auth.verifyEmail({
      rawToken: mailer.verifications[0]!.rawToken,
      requestId: "r2",
    });
    const first = await auth.login({
      email: "nina@example.by",
      password: "correct-horse",
      requestId: "r3",
      rateKey: "ip:5",
      secureCookie: false,
    });
    const second = await auth.login({
      email: "nina@example.by",
      password: "correct-horse",
      requestId: "r4",
      rateKey: "ip:5",
      secureCookie: false,
    });
    const changed = await auth.changePassword({
      principal: first.principal,
      currentPassword: "correct-horse",
      password: "new-correct",
      requestId: "r5",
      rateKey: "ip:5",
      secureCookie: false,
    });
    expect(await auth.resolve(first.cookie.value)).toEqual({ type: "anonymous" });
    expect(await auth.resolve(second.cookie.value)).toEqual({ type: "anonymous" });
    expect((await auth.resolve(changed.cookie.value)).type).toBe("customer");
    await expect(
      auth.changePassword({
        principal: first.principal,
        currentPassword: "wrong-password",
        password: "another-one",
        requestId: "r6",
        rateKey: "ip:5",
        secureCookie: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    const again = await auth.login({
      email: "nina@example.by",
      password: "new-correct",
      requestId: "r7",
      rateKey: "ip:5",
      secureCookie: false,
    });
    const cleared = await auth.logoutAllSessions({
      principal: again.principal,
      requestId: "r8",
      secureCookie: false,
    });
    expect(cleared.cookie.maxAge).toBe(0);
    expect(await auth.resolve(again.cookie.value)).toEqual({ type: "anonymous" });
    expect(await auth.resolve(changed.cookie.value)).toEqual({ type: "anonymous" });
  });

  it("ends a staff session after the idle window", async () => {
    const now = { value: new Date("2026-09-12T12:00:00.000Z") };
    const passwords = createArgon2PasswordHasher({ cheap: true });
    const users = createMemoryUserAccounts();
    const created = await users.create({
      email: "clerk@bikes.local",
      passwordHash: await passwords.hash("correct-horse"),
      role: "STAFF",
    });
    await users.save({
      ...created,
      staffRoles: ["inventory"],
      emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const auth = createAuthServices({
      users,
      sessions: createMemorySessions(),
      tokens: createMemoryAuthTokens(),
      passwords,
      tokensDigest: createSha256TokenDigest(),
      mailer: createCapturingMailer(),
      limiter: createMemoryRateLimiter({ limit: 20, windowMs: 60_000 }),
      log: createSecurityLog(),
      clock: { now: () => now.value },
      dummyPasswordHash: await passwords.hash("timing-pad"),
    });
    const loggedIn = await auth.login({
      email: "clerk@bikes.local",
      password: "correct-horse",
      requestId: "r1",
      rateKey: "ip:staff",
      secureCookie: false,
    });
    expect(loggedIn.principal.type).toBe("staff");
    expect(loggedIn.cookie.maxAge).toBe(STAFF_SESSION_MAX_MS / 1000);
    expect(await auth.resolve(loggedIn.cookie.value)).toEqual(loggedIn.principal);
    now.value = new Date(now.value.getTime() + STAFF_SESSION_IDLE_MS + 1);
    expect(await auth.resolve(loggedIn.cookie.value)).toEqual({ type: "anonymous" });
  });

  it("lets staff look up emails by user id and keeps customers out", async () => {
    const users = createMemoryUserAccounts();
    const passwords = createArgon2PasswordHasher({ cheap: true });
    const created = await users.create({
      email: "stock@bikes.local",
      passwordHash: await passwords.hash("correct-horse"),
      role: "STAFF",
    });
    const auth = createAuthServices({
      users,
      sessions: createMemorySessions(),
      tokens: createMemoryAuthTokens(),
      passwords,
      tokensDigest: createSha256TokenDigest(),
      mailer: createCapturingMailer(),
      limiter: createMemoryRateLimiter({ limit: 20, windowMs: 60_000 }),
      log: createSecurityLog(),
      clock: { now: () => new Date() },
      dummyPasswordHash: await passwords.hash("timing-pad"),
    });
    expect(
      await auth.lookupEmails(staffPrincipal("s1", ["inventory"]), [created.id]),
    ).toEqual([{ userId: created.id, email: "stock@bikes.local" }]);
    await expect(
      auth.lookupEmails(customerPrincipal("c1"), [created.id]),
    ).rejects.toBeInstanceOf(ForbiddenError);
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
