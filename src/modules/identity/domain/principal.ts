import { parseStaffRoles, type StaffRole } from "./roles";

export type Principal =
  | { type: "anonymous" }
  | { type: "customer"; userId: string }
  | { type: "staff"; userId: string; roles: StaffRole[] };

export function anonymousPrincipal(): Principal {
  return { type: "anonymous" };
}

export function customerPrincipal(userId: string): Principal {
  return { type: "customer", userId };
}

export function staffPrincipal(userId: string, roles: readonly StaffRole[]): Principal {
  return { type: "staff", userId, roles: [...roles] };
}

export function isAuthenticated(
  principal: Principal,
): principal is Extract<Principal, { type: "customer" | "staff" }> {
  return principal.type !== "anonymous";
}

export function isStaff(
  principal: Principal,
): principal is Extract<Principal, { type: "staff" }> {
  return principal.type === "staff";
}

export function actorUserId(principal: Principal): string | null {
  return principal.type === "anonymous" ? null : principal.userId;
}

/**
 * Development and test bearers: `customer:<userId>` or
 * `staff:<userId>` / `staff:<userId>:admin,inventory`.
 */
export function parseBearerPrincipal(token: string | null): Principal {
  if (token === null || token.length === 0) {
    return { type: "anonymous" };
  }
  const customer = /^customer:([A-Za-z0-9._-]{1,128})$/.exec(token);
  if (customer?.[1]) {
    return { type: "customer", userId: customer[1] };
  }
  const staff = /^staff:([A-Za-z0-9._-]{1,128})(?::([a-z_,]+))?$/.exec(token);
  if (staff?.[1]) {
    return { type: "staff", userId: staff[1], roles: parseStaffRoles(staff[2]) };
  }
  return { type: "anonymous" };
}
