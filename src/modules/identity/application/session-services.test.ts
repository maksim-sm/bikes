import { describe, expect, it } from "vitest";
import { ForbiddenError, UnauthenticatedError } from "@/lib/errors";
import { parseBearerPrincipal } from "../domain/principal";
import { createBearerSessionPort, createSessionServices } from "./session-services";

describe("principal parsing", () => {
  it("treats missing or unknown tokens as anonymous", () => {
    expect(parseBearerPrincipal(null)).toEqual({ type: "anonymous" });
    expect(parseBearerPrincipal("totally-not-a-session")).toEqual({ type: "anonymous" });
  });

  it("parses customer and staff bearers", () => {
    expect(parseBearerPrincipal("customer:user-1")).toEqual({
      type: "customer",
      userId: "user-1",
    });
    expect(parseBearerPrincipal("staff:staff-1")).toEqual({
      type: "staff",
      userId: "staff-1",
      roles: [],
    });
    expect(parseBearerPrincipal("staff:staff-1:inventory")).toEqual({
      type: "staff",
      userId: "staff-1",
      roles: ["inventory"],
    });
  });
});

describe("session services", () => {
  const sessions = createSessionServices({ sessions: createBearerSessionPort() });

  it("enforces authentication and staff role", async () => {
    const guest = await sessions.resolve(null);
    expect(() => sessions.requireAuthenticated(guest)).toThrow(UnauthenticatedError);
    const customer = await sessions.resolve("customer:user-1");
    expect(() => sessions.requireStaff(customer)).toThrow(ForbiddenError);
    const staff = await sessions.resolve("staff:staff-1:admin");
    expect(sessions.requireStaff(staff).type).toBe("staff");
    expect(sessions.requireAdmin(staff).roles).toEqual(["admin"]);
    expect(() => sessions.requireInventoryRole(customer)).toThrow(ForbiddenError);
  });
});
