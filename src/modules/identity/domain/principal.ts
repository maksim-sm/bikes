export type Principal =
  | { type: "anonymous" }
  | { type: "customer"; userId: string }
  | { type: "staff"; userId: string };

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
 * Development and test bearer tokens: `customer:<userId>` or `staff:<userId>`.
 * Production session verification replaces this parser.
 */
export function parseBearerPrincipal(token: string | null): Principal {
  if (token === null || token.length === 0) {
    return { type: "anonymous" };
  }
  const customer = /^customer:([A-Za-z0-9._-]{1,128})$/.exec(token);
  if (customer?.[1]) {
    return { type: "customer", userId: customer[1] };
  }
  const staff = /^staff:([A-Za-z0-9._-]{1,128})$/.exec(token);
  if (staff?.[1]) {
    return { type: "staff", userId: staff[1] };
  }
  return { type: "anonymous" };
}
