import { describe, expect, it } from "vitest";
import { HOST_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } from "./auth";
import {
  readSessionTokenFromHeader,
  serializeCookie,
  sessionCookie,
  sessionCookieName,
} from "./cookie";

describe("session cookies", () => {
  it("uses a __Host- name, Secure, and Path=/ when the cookie is secure", () => {
    expect(sessionCookieName(true)).toBe(HOST_SESSION_COOKIE_NAME);
    const cookie = sessionCookie("token", true);
    expect(cookie.name).toBe("__Host-bikes_session");
    expect(cookie.secure).toBe(true);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.path).toBe("/");
    expect(serializeCookie(cookie)).toContain("Secure");
    expect(serializeCookie(cookie)).toContain("HttpOnly");
    expect(serializeCookie(cookie)).toContain("SameSite=Lax");
    expect(serializeCookie(cookie)).not.toMatch(/Domain=/i);
  });

  it("keeps the unprefixed name on http so browsers will store it", () => {
    expect(sessionCookieName(false)).toBe(SESSION_COOKIE_NAME);
    expect(sessionCookie("token", false).name).toBe("bikes_session");
    expect(serializeCookie(sessionCookie("token", false))).not.toContain("Secure");
  });

  it("prefers the host-prefixed cookie when both are sent", () => {
    const header = "bikes_session=legacy; __Host-bikes_session=current; other=1";
    expect(readSessionTokenFromHeader(header)).toBe("current");
    expect(readSessionTokenFromHeader("bikes_session=legacy")).toBe("legacy");
    expect(readSessionTokenFromHeader(null)).toBeNull();
  });
});
