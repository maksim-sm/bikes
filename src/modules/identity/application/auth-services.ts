import {
  ConflictError,
  NotFoundError,
  RateLimitedError,
  UnauthenticatedError,
  ValidationError,
} from "@/lib/errors";
import { requireAuthenticated, requireCustomer } from "./authorization";
import {
  EMAIL_VERIFY_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  SESSION_TTL_MS,
  assertPasswordPolicy,
  canAuthenticate,
  isSessionActive,
  isTokenActive,
  normalizeEmail,
  principalForUser,
  type AuthUser,
} from "../domain/auth";
import {
  clearedSessionCookie,
  sessionCookie,
  type SessionCookie,
} from "../domain/cookie";
import type { Principal } from "../domain/principal";
import type {
  AuthMailer,
  AuthTokenRepository,
  Clock,
  PasswordHasher,
  RateLimiter,
  SecurityLog,
  SessionRepository,
  TokenDigest,
  UserAccountRepository,
} from "./auth-ports";

const INVALID_CREDENTIALS = "invalid email or password";

export interface AuthServices {
  register(input: {
    email: string;
    password: string;
    requestId: string;
    rateKey: string;
  }): Promise<{ verificationRequired: true }>;
  login(input: {
    email: string;
    password: string;
    requestId: string;
    rateKey: string;
    secureCookie: boolean;
  }): Promise<{ principal: Principal; cookie: SessionCookie }>;
  logout(input: {
    rawToken: string | null;
    requestId: string;
    secureCookie: boolean;
  }): Promise<{ cookie: SessionCookie }>;
  requestPasswordReset(input: {
    email: string;
    requestId: string;
    rateKey: string;
  }): Promise<{ accepted: true }>;
  resetPassword(input: {
    rawToken: string;
    password: string;
    requestId: string;
    rateKey: string;
  }): Promise<{ accepted: true }>;
  verifyEmail(input: {
    rawToken: string;
    requestId: string;
  }): Promise<{ verified: true }>;
  resendVerification(input: {
    email: string;
    requestId: string;
    rateKey: string;
  }): Promise<{ accepted: true }>;
  resolve(rawToken: string | null): Promise<Principal>;
  getAccount(principal: Principal): Promise<{ userId: string; email: string }>;
  changePassword(input: {
    principal: Principal;
    currentPassword: string;
    password: string;
    requestId: string;
    rateKey: string;
    secureCookie: boolean;
  }): Promise<{ cookie: SessionCookie }>;
  logoutAllSessions(input: {
    principal: Principal;
    requestId: string;
    secureCookie: boolean;
  }): Promise<{ cookie: SessionCookie }>;
}

export function createAuthServices(deps: {
  users: UserAccountRepository;
  sessions: SessionRepository;
  tokens: AuthTokenRepository;
  passwords: PasswordHasher;
  tokensDigest: TokenDigest;
  mailer: AuthMailer;
  limiter: RateLimiter;
  log: SecurityLog;
  clock: Clock;
  dummyPasswordHash: string;
}): AuthServices {
  async function gate(rateKey: string): Promise<void> {
    const result = await deps.limiter.consume(rateKey);
    if (!result.ok) {
      throw new RateLimitedError("too many attempts", {
        retryAfterSec: result.retryAfterSec,
      });
    }
  }

  async function issueSession(
    user: AuthUser,
    secureCookie: boolean,
  ): Promise<SessionCookie> {
    const now = deps.clock.now();
    const token = deps.tokensDigest.generate();
    await deps.sessions.insert({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: token.hash,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      revokedAt: null,
    });
    return sessionCookie(token.raw, secureCookie);
  }

  async function issueOneTime(
    user: AuthUser,
    type: "EMAIL_VERIFY" | "PASSWORD_RESET",
  ): Promise<string> {
    const now = deps.clock.now();
    const token = deps.tokensDigest.generate();
    const ttl = type === "EMAIL_VERIFY" ? EMAIL_VERIFY_TTL_MS : PASSWORD_RESET_TTL_MS;
    await deps.tokens.insert({
      id: crypto.randomUUID(),
      userId: user.id,
      type,
      tokenHash: token.hash,
      expiresAt: new Date(now.getTime() + ttl),
      consumedAt: null,
    });
    return token.raw;
  }

  return {
    async register(input) {
      await gate(input.rateKey);
      const email = normalizeEmail(input.email);
      try {
        assertPasswordPolicy(input.password);
      } catch {
        throw new ValidationError("password does not meet the policy");
      }
      const existing = await deps.users.findByEmail(email);
      if (existing) {
        deps.log.record("auth.register.duplicate", { requestId: input.requestId, email });
        return { verificationRequired: true };
      }
      const passwordHash = await deps.passwords.hash(input.password);
      const user = await deps.users.create({
        email,
        passwordHash,
        role: "CUSTOMER",
      });
      const rawToken = await issueOneTime(user, "EMAIL_VERIFY");
      await deps.mailer.sendEmailVerification({ email, rawToken });
      deps.log.record("auth.register", {
        requestId: input.requestId,
        userId: user.id,
        email,
      });
      return { verificationRequired: true };
    },

    async login(input) {
      await gate(input.rateKey);
      const email = normalizeEmail(input.email);
      const user = await deps.users.findByEmail(email);
      const hash = user?.passwordHash ?? deps.dummyPasswordHash;
      const matches = await deps.passwords.verify(hash, input.password);
      if (!user || !matches) {
        deps.log.record("auth.login.failure", { requestId: input.requestId, email });
        throw new UnauthenticatedError(INVALID_CREDENTIALS);
      }
      const readiness = canAuthenticate(user, deps.clock.now());
      if (readiness === "disabled") {
        deps.log.record("auth.login.failure", {
          requestId: input.requestId,
          userId: user.id,
          email,
        });
        throw new UnauthenticatedError(INVALID_CREDENTIALS);
      }
      if (readiness === "unverified") {
        deps.log.record("auth.login.unverified", {
          requestId: input.requestId,
          userId: user.id,
          email,
        });
        throw new ConflictError("email not verified");
      }
      const cookie = await issueSession(user, input.secureCookie);
      const principal = principalForUser(user);
      deps.log.record("auth.login.success", {
        requestId: input.requestId,
        userId: user.id,
        email,
      });
      return { principal, cookie };
    },

    async logout(input) {
      if (input.rawToken) {
        const session = await deps.sessions.findByTokenHash(
          deps.tokensDigest.hash(input.rawToken),
        );
        if (session && isSessionActive(session, deps.clock.now())) {
          await deps.sessions.revoke(session.id, deps.clock.now());
          deps.log.record("auth.logout", {
            requestId: input.requestId,
            userId: session.userId,
          });
        }
      }
      return { cookie: clearedSessionCookie(input.secureCookie) };
    },

    async requestPasswordReset(input) {
      await gate(input.rateKey);
      const email = normalizeEmail(input.email);
      const user = await deps.users.findByEmail(email);
      if (user && user.disabledAt === null) {
        const rawToken = await issueOneTime(user, "PASSWORD_RESET");
        await deps.mailer.sendPasswordReset({ email, rawToken });
      }
      deps.log.record("auth.password_reset.request", {
        requestId: input.requestId,
        email,
      });
      return { accepted: true };
    },

    async resetPassword(input) {
      await gate(input.rateKey);
      try {
        assertPasswordPolicy(input.password);
      } catch {
        throw new ValidationError("password does not meet the policy");
      }
      const token = await deps.tokens.findByHash(deps.tokensDigest.hash(input.rawToken));
      if (
        !token ||
        token.type !== "PASSWORD_RESET" ||
        !isTokenActive(token, deps.clock.now())
      ) {
        throw new UnauthenticatedError("reset token is invalid");
      }
      const user = await deps.users.findById(token.userId);
      if (!user) {
        throw new UnauthenticatedError("reset token is invalid");
      }
      await deps.tokens.consume(token.id, deps.clock.now());
      user.passwordHash = await deps.passwords.hash(input.password);
      await deps.users.save(user);
      const revoked = await deps.sessions.revokeAllForUser(user.id, deps.clock.now());
      deps.log.record("auth.password_reset.complete", {
        requestId: input.requestId,
        userId: user.id,
      });
      deps.log.record("auth.session_revoked", {
        requestId: input.requestId,
        userId: user.id,
      });
      void revoked;
      return { accepted: true };
    },

    async verifyEmail(input) {
      const token = await deps.tokens.findByHash(deps.tokensDigest.hash(input.rawToken));
      if (
        !token ||
        token.type !== "EMAIL_VERIFY" ||
        !isTokenActive(token, deps.clock.now())
      ) {
        throw new UnauthenticatedError("verification token is invalid");
      }
      const user = await deps.users.findById(token.userId);
      if (!user) {
        throw new UnauthenticatedError("verification token is invalid");
      }
      await deps.tokens.consume(token.id, deps.clock.now());
      user.emailVerifiedAt = deps.clock.now();
      await deps.users.save(user);
      deps.log.record("auth.email_verified", {
        requestId: input.requestId,
        userId: user.id,
      });
      return { verified: true };
    },

    async resendVerification(input) {
      await gate(input.rateKey);
      const email = normalizeEmail(input.email);
      const user = await deps.users.findByEmail(email);
      if (user && user.emailVerifiedAt === null && user.disabledAt === null) {
        const rawToken = await issueOneTime(user, "EMAIL_VERIFY");
        await deps.mailer.sendEmailVerification({ email, rawToken });
      }
      deps.log.record("auth.email.resend", { requestId: input.requestId, email });
      return { accepted: true };
    },

    async resolve(rawToken) {
      if (rawToken === null || rawToken.length === 0) {
        return { type: "anonymous" };
      }
      const session = await deps.sessions.findByTokenHash(
        deps.tokensDigest.hash(rawToken),
      );
      if (!session || !isSessionActive(session, deps.clock.now())) {
        return { type: "anonymous" };
      }
      const user = await deps.users.findById(session.userId);
      if (!user || canAuthenticate(user, deps.clock.now()) !== "ok") {
        return { type: "anonymous" };
      }
      return principalForUser(user);
    },

    async getAccount(principal) {
      const authenticated = requireAuthenticated(principal);
      const user = await deps.users.findById(authenticated.userId);
      if (!user) {
        throw new NotFoundError("account not found", { userId: authenticated.userId });
      }
      return { userId: user.id, email: user.email };
    },

    async changePassword(input) {
      await gate(input.rateKey);
      const customer = requireCustomer(input.principal);
      try {
        assertPasswordPolicy(input.password);
      } catch {
        throw new ValidationError("password does not meet the policy");
      }
      const user = await deps.users.findById(customer.userId);
      if (!user) {
        throw new UnauthenticatedError(INVALID_CREDENTIALS);
      }
      const matches = await deps.passwords.verify(
        user.passwordHash,
        input.currentPassword,
      );
      if (!matches) {
        throw new ValidationError("current password is incorrect");
      }
      user.passwordHash = await deps.passwords.hash(input.password);
      await deps.users.save(user);
      await deps.sessions.revokeAllForUser(user.id, deps.clock.now());
      const cookie = await issueSession(user, input.secureCookie);
      deps.log.record("auth.password_change", {
        requestId: input.requestId,
        userId: user.id,
      });
      deps.log.record("auth.session_revoked", {
        requestId: input.requestId,
        userId: user.id,
      });
      return { cookie };
    },

    async logoutAllSessions(input) {
      const authenticated = requireAuthenticated(input.principal);
      await deps.sessions.revokeAllForUser(authenticated.userId, deps.clock.now());
      deps.log.record("auth.session_revoked", {
        requestId: input.requestId,
        userId: authenticated.userId,
      });
      return { cookie: clearedSessionCookie(input.secureCookie) };
    },
  };
}
