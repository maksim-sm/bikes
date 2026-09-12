import { describe, expect, it } from "vitest";
import {
  STAFF_SESSION_IDLE_MS,
  STAFF_SESSION_MAX_MS,
  SESSION_TTL_MS,
  isSessionActive,
  sessionPolicyFor,
  type AuthUser,
  type StoredSession,
} from "./auth";

function session(overrides: Partial<StoredSession> = {}): StoredSession {
  const now = new Date("2026-09-12T12:00:00.000Z");
  return {
    id: "s1",
    userId: "u1",
    tokenHash: "hash",
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    lastSeenAt: now,
    revokedAt: null,
    ...overrides,
  };
}

function staff(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "staff-1",
    email: "staff@bikes.local",
    passwordHash: "hash",
    role: "STAFF",
    staffRoles: ["admin"],
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    disabledAt: null,
    ...overrides,
  };
}

describe("session timeout policy", () => {
  it("gives staff a short idle window and a 12-hour ceiling", () => {
    expect(sessionPolicyFor(staff()).idleMs).toBe(STAFF_SESSION_IDLE_MS);
    expect(sessionPolicyFor(staff()).maxMs).toBe(STAFF_SESSION_MAX_MS);
    expect(
      sessionPolicyFor({ ...staff(), role: "CUSTOMER", staffRoles: [] }).idleMs,
    ).toBeNull();
  });

  it("expires a staff session after idle, even if the absolute TTL remains", () => {
    const issued = new Date("2026-09-12T12:00:00.000Z");
    const row = session({
      lastSeenAt: issued,
      expiresAt: new Date(issued.getTime() + STAFF_SESSION_MAX_MS),
    });
    const stillActive = new Date(issued.getTime() + STAFF_SESSION_IDLE_MS - 1);
    const idle = new Date(issued.getTime() + STAFF_SESSION_IDLE_MS);
    expect(isSessionActive(row, stillActive, STAFF_SESSION_IDLE_MS)).toBe(true);
    expect(isSessionActive(row, idle, STAFF_SESSION_IDLE_MS)).toBe(false);
    expect(isSessionActive(row, idle, null)).toBe(true);
  });
});
