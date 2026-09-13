import { describe, expect, it } from "vitest";
import { DEV_AUTH_SECRET } from "@/lib/config";
import {
  GUEST_CART_COOKIE,
  HOST_GUEST_CART_COOKIE,
  guestCartCookie,
  guestCartCookieName,
  signGuestToken,
  verifyGuestCookieValue,
} from "./guest-cart";

const token = "11111111-1111-4111-8111-111111111111";

describe("guest cart cookies", () => {
  it("signs the token with AUTH_SECRET and verifies it", () => {
    const signed = signGuestToken(token, DEV_AUTH_SECRET);
    expect(signed.startsWith(`${token}.`)).toBe(true);
    expect(verifyGuestCookieValue(signed, DEV_AUTH_SECRET, true)).toBe(token);
    expect(verifyGuestCookieValue(`${token}.tampered`, DEV_AUTH_SECRET, true)).toBeNull();
  });

  it("rejects unsigned tokens when a signature is required", () => {
    expect(verifyGuestCookieValue(token, DEV_AUTH_SECRET, true)).toBeNull();
    expect(verifyGuestCookieValue(token, DEV_AUTH_SECRET, false)).toBe(token);
  });

  it("uses the __Host- name on secure cookies", () => {
    expect(guestCartCookieName(true)).toBe(HOST_GUEST_CART_COOKIE);
    expect(guestCartCookieName(false)).toBe(GUEST_CART_COOKIE);
    const cookie = guestCartCookie(token, true);
    expect(cookie.name).toBe(HOST_GUEST_CART_COOKIE);
    expect(cookie.secure).toBe(true);
    expect(cookie.value.startsWith(`${token}.`)).toBe(true);
  });
});
