import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ConflictError, UnauthenticatedError } from "@/lib/errors";
import { createCapturingMailer, createPrismaAuthServices } from "@/modules/identity";
import { createTestPrisma, ensureTestDatabase, resetTestData } from "./harness";
import type { PrismaClient } from "../../src/generated/prisma/client";

describe("authentication against PostgreSQL", () => {
  let client: PrismaClient;

  beforeAll(async () => {
    await ensureTestDatabase();
    client = createTestPrisma();
  }, 60_000);

  afterEach(async () => {
    await resetTestData(client);
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it("persists a verified user and a hashed session that logout revokes", async () => {
    const mailer = createCapturingMailer();
    const auth = await createPrismaAuthServices({
      mailer,
      prisma: client,
      cheapHasher: true,
    });
    await auth.register({
      email: "ivan@example.by",
      password: "correct-horse",
      requestId: "r1",
      rateKey: "ip:1",
    });
    const stored = await client.user.findUnique({
      where: { email: "ivan@example.by" },
    });
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toContain("correct-horse");
    expect(stored?.emailVerifiedAt).toBeNull();

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
    expect(
      (await client.user.findUnique({ where: { email: "ivan@example.by" } }))
        ?.emailVerifiedAt,
    ).not.toBeNull();

    const loggedIn = await auth.login({
      email: "ivan@example.by",
      password: "correct-horse",
      requestId: "r4",
      rateKey: "ip:1",
      secureCookie: false,
    });
    expect(loggedIn.principal).toEqual({ type: "customer", userId: stored!.id });
    expect(await client.authSession.count({ where: { revokedAt: null } })).toBe(1);
    expect(await auth.resolve(loggedIn.cookie.value)).toEqual(loggedIn.principal);

    await auth.logout({
      rawToken: loggedIn.cookie.value,
      requestId: "r5",
      secureCookie: false,
    });
    expect(await auth.resolve(loggedIn.cookie.value)).toEqual({ type: "anonymous" });
    expect(await client.authSession.count({ where: { revokedAt: null } })).toBe(0);
  });

  it("does not create a second user row for a duplicate email", async () => {
    const mailer = createCapturingMailer();
    const auth = await createPrismaAuthServices({
      mailer,
      prisma: client,
      cheapHasher: true,
    });
    await auth.register({
      email: "anna@example.by",
      password: "correct-horse",
      requestId: "r1",
      rateKey: "ip:2",
    });
    await auth.register({
      email: "anna@example.by",
      password: "correct-horse",
      requestId: "r2",
      rateKey: "ip:2",
    });
    expect(await client.user.count({ where: { email: "anna@example.by" } })).toBe(1);
    await expect(
      auth.login({
        email: "nobody@example.by",
        password: "wrong-password",
        requestId: "r3",
        rateKey: "ip:2",
        secureCookie: false,
      }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
