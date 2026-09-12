export const SESSION_COOKIE_NAME = "bikes_session";
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export type AuthUserRole = "CUSTOMER" | "STAFF";

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  role: AuthUserRole;
  emailVerifiedAt: Date | null;
  disabledAt: Date | null;
}

export interface StoredSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface StoredAuthToken {
  id: string;
  userId: string;
  type: "EMAIL_VERIFY" | "PASSWORD_RESET";
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertPasswordPolicy(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error("password_policy");
  }
}

export function isSessionActive(session: StoredSession, now: Date): boolean {
  if (session.revokedAt !== null) {
    return false;
  }
  return session.expiresAt.getTime() > now.getTime();
}

export function isTokenActive(token: StoredAuthToken, now: Date): boolean {
  if (token.consumedAt !== null) {
    return false;
  }
  return token.expiresAt.getTime() > now.getTime();
}

export function canAuthenticate(
  user: AuthUser,
  now: Date,
): "ok" | "disabled" | "unverified" {
  if (user.disabledAt !== null && user.disabledAt.getTime() <= now.getTime()) {
    return "disabled";
  }
  if (user.role === "CUSTOMER" && user.emailVerifiedAt === null) {
    return "unverified";
  }
  return "ok";
}

export function principalTypeForRole(role: AuthUserRole): "customer" | "staff" {
  return role === "STAFF" ? "staff" : "customer";
}
