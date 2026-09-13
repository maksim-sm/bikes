import { createAuthServices, type AuthServices } from "./auth-services";
import { createArgon2PasswordHasher } from "../infrastructure/argon2-hasher";
import {
  createCapturingMailer,
  createLoggingMailer,
} from "../infrastructure/logging-mailer";
import {
  createMemoryAuthTokens,
  createMemorySessions,
  createMemoryUserAccounts,
} from "../infrastructure/memory-auth-repository";
import { createMemoryRateLimiter } from "../infrastructure/memory-rate-limiter";
import { createSecurityLog } from "../infrastructure/security-log";
import { createSha256TokenDigest } from "../infrastructure/sha256-token";
import type { AuthMailer } from "./auth-ports";

export async function createMemoryAuthServices(options?: {
  mailer?: AuthMailer;
  cheapHasher?: boolean;
}): Promise<
  AuthServices & { mailer: ReturnType<typeof createCapturingMailer> | AuthMailer }
> {
  const passwords = createArgon2PasswordHasher({ cheap: options?.cheapHasher ?? true });
  const mailer = options?.mailer ?? createCapturingMailer();
  const dummyPasswordHash = await passwords.hash("timing-pad");
  const services = createAuthServices({
    users: createMemoryUserAccounts(),
    sessions: createMemorySessions(),
    tokens: createMemoryAuthTokens(),
    passwords,
    tokensDigest: createSha256TokenDigest(),
    mailer,
    limiter: createMemoryRateLimiter({ limit: 20, windowMs: 60_000 }),
    log: createSecurityLog(),
    clock: { now: () => new Date() },
    dummyPasswordHash,
  });
  return Object.assign(services, { mailer });
}

export const DEMO_STAFF_EMAIL = "staff@bikes.local";
export const DEMO_STAFF_PASSWORD = "StaffPass12";
export const DEMO_CUSTOMER_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_CUSTOMER_EMAIL = "customer@bikes.local";
export const DEMO_CUSTOMER_PASSWORD = "CustomerPass12";

/** Development staff and customer accounts: verified, no Prisma required. */
export async function createDemoAuthServices(options?: {
  mailer?: AuthMailer;
}): Promise<AuthServices> {
  const passwords = createArgon2PasswordHasher({ cheap: true });
  const users = createMemoryUserAccounts();
  const dummyPasswordHash = await passwords.hash("timing-pad");
  const created = await users.create({
    email: DEMO_STAFF_EMAIL,
    passwordHash: await passwords.hash(DEMO_STAFF_PASSWORD),
    role: "STAFF",
  });
  await users.save({
    ...created,
    staffRoles: ["admin"],
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  const customer = await users.create({
    id: DEMO_CUSTOMER_ID,
    email: DEMO_CUSTOMER_EMAIL,
    passwordHash: await passwords.hash(DEMO_CUSTOMER_PASSWORD),
    role: "CUSTOMER",
  });
  await users.save({
    ...customer,
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  return createAuthServices({
    users,
    sessions: createMemorySessions(),
    tokens: createMemoryAuthTokens(),
    passwords,
    tokensDigest: createSha256TokenDigest(),
    mailer: options?.mailer ?? createCapturingMailer(),
    limiter: createMemoryRateLimiter({ limit: 20, windowMs: 60_000 }),
    log: createSecurityLog(),
    clock: { now: () => new Date() },
    dummyPasswordHash,
  });
}

export async function createPrismaAuthServices(options?: {
  mailer?: AuthMailer;
}): Promise<AuthServices> {
  const { createPrismaAuthTokens, createPrismaSessions, createPrismaUserAccounts } =
    await import("../infrastructure/prisma-auth-repository");
  const passwords = createArgon2PasswordHasher();
  const dummyPasswordHash = await passwords.hash("timing-pad");
  return createAuthServices({
    users: createPrismaUserAccounts(),
    sessions: createPrismaSessions(),
    tokens: createPrismaAuthTokens(),
    passwords,
    tokensDigest: createSha256TokenDigest(),
    mailer: options?.mailer ?? createLoggingMailer(),
    limiter: createMemoryRateLimiter(),
    log: createSecurityLog(),
    clock: { now: () => new Date() },
    dummyPasswordHash,
  });
}
