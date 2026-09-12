import type { AuthUser, StoredAuthToken, StoredSession } from "../domain/auth";

export interface Clock {
  now(): Date;
}

export interface UserAccountRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  create(input: {
    id?: string;
    email: string;
    passwordHash: string;
    role: AuthUser["role"];
  }): Promise<AuthUser>;
  save(user: AuthUser): Promise<AuthUser>;
}

export interface SessionRepository {
  insert(session: StoredSession): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<StoredSession | null>;
  revoke(id: string, at: Date): Promise<void>;
  revokeAllForUser(userId: string, at: Date): Promise<number>;
}

export interface AuthTokenRepository {
  insert(token: StoredAuthToken): Promise<void>;
  findByHash(tokenHash: string): Promise<StoredAuthToken | null>;
  consume(id: string, at: Date): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export interface TokenDigest {
  generate(): { raw: string; hash: string };
  hash(raw: string): string;
}

export interface AuthMailer {
  sendEmailVerification(input: { email: string; rawToken: string }): Promise<void>;
  sendPasswordReset(input: { email: string; rawToken: string }): Promise<void>;
}

export interface RateLimiter {
  consume(key: string): Promise<{ ok: true } | { ok: false; retryAfterSec: number }>;
}

export interface SecurityLog {
  record(
    event: string,
    context: { requestId?: string; userId?: string; email?: string },
  ): void;
}
