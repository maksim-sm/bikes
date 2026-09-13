import { describe, expect, it } from "vitest";
import { ConflictError } from "@/lib/errors";
import { toHttpError } from "@/lib/http";
import { parseWithSchema } from "@/lib/http/validation";
import { z } from "zod";
import {
  emailActionUrl,
  emailHtml,
  formatNumber,
  formatPlural,
  formatPrice,
  formatStoreDateTime,
  interpolate,
  isLocale,
  localeMeta,
  notificationCopy,
  pluralCategory,
  productPageTitle,
  renderEmail,
  resolveLocale,
  systemMessage,
  t,
} from "./index";

describe("locale registry", () => {
  it("ships Russian for Belarus and rejects unknown tags", () => {
    expect(resolveLocale("ru")).toBe("ru");
    expect(resolveLocale("de")).toBe("ru");
    expect(isLocale("be")).toBe(false);
    expect(localeMeta.ru.bcp47).toBe("ru-BY");
    expect(localeMeta.ru.timeZone).toBe("Europe/Minsk");
    expect(localeMeta.ru.currency).toBe("BYN");
  });
});

describe("formatters", () => {
  it("formats BYN from integer kopeks", () => {
    const formatted = formatPrice(459_900);
    expect(formatted).toContain("4");
    expect(formatted).toMatch(/459|4\s?599|4\u00a0599/);
    expect(formatted.includes("BYN") || formatted.includes("Br")).toBe(true);
  });

  it("formats numbers and Minsk-local instants with a zone label", () => {
    expect(formatNumber(1200)).toMatch(/1[\s\u00a0]?200/);
    const instant = new Date("2026-09-12T18:00:00.000Z");
    const formatted = formatStoreDateTime(instant);
    expect(formatted).toContain(t.time.zoneMinsk);
    expect(formatted).toMatch(/21:00|21\.00/);
  });
});

describe("pluralization", () => {
  it("uses Russian one / few / many", () => {
    expect(pluralCategory(1)).toBe("one");
    expect(pluralCategory(2)).toBe("few");
    expect(pluralCategory(5)).toBe("many");
    expect(pluralCategory(21)).toBe("one");
    expect(formatPlural(1, t.plural.unitsLeft)).toContain("штука");
    expect(formatPlural(2, t.plural.unitsLeft)).toContain("штуки");
    expect(formatPlural(5, t.plural.unitsLeft)).toContain("штук");
  });
});

describe("system messages and notifications", () => {
  it("maps error codes and interpolates notification copy", () => {
    expect(systemMessage("not_found")).toBe(t.errors.not_found);
    expect(systemMessage("no-such-code")).toBe(t.errors.internal_error);
    expect(toHttpError(new ConflictError("insufficient available inventory"))).toEqual({
      status: 409,
      code: "conflict",
      message: t.errors.conflict,
    });
    expect(toHttpError(new Error("ECONNRESET boom")).message).toBe(t.errors.internal_error);
    const placed = notificationCopy("order.placed", { number: "B-1" });
    expect(placed.body).toContain("B-1");
    expect(placed.title).toBe(t.notifications["order.placed"].title);
  });
});

describe("emails and metadata", () => {
  it("renders Russian mail without leaking the token into HTML escaping holes", () => {
    const url = emailActionUrl("verify", "secret-token");
    expect(url).toContain("/verify?token=secret-token");
    const rendered = renderEmail("verify", {
      shop: t.site.name,
      email: "ira@example.by",
      url,
    });
    expect(rendered.subject).toContain(t.site.name);
    expect(rendered.text).toContain("ira@example.by");
    expect(rendered.text).toContain(url);
    expect(emailHtml(rendered)).toContain("<p>");
    expect(emailHtml(rendered)).toContain("ira@example.by");
    expect(productPageTitle("Trek", "Émonda")).toBe("Trek Émonda");
    expect(interpolate(t.checkout.confirmationLead, { number: "B-9" })).toContain("B-9");
  });
});

describe("validation copy", () => {
  it("surfaces Zod failures in Russian", () => {
    expect(() =>
      parseWithSchema(z.object({ quantity: z.number() }), { quantity: "x" }),
    ).toThrow(t.validation.invalidType);
  });
});
