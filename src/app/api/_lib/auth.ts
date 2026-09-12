import {
  SESSION_COOKIE_NAME,
  createSessionServices,
  readCookieValue,
  type Principal,
} from "@/modules/identity";
import { getAuthServices } from "./compose";

const gates = createSessionServices({
  sessions: {
    async resolve() {
      return { type: "anonymous" };
    },
  },
});

export type AuthPolicy =
  | "public"
  | "anonymous"
  | "customer"
  | "customer_only"
  | "staff"
  | "admin"
  | "manager"
  | "inventory"
  | "order_management";

export async function resolvePrincipal(headers: Headers): Promise<Principal> {
  const auth = await getAuthServices();
  return auth.resolve(readCookieValue(headers.get("cookie"), SESSION_COOKIE_NAME));
}

export function enforcePolicy(principal: Principal, policy: AuthPolicy): Principal {
  switch (policy) {
    case "public":
      return principal;
    case "anonymous":
      return gates.requireAnonymous(principal);
    case "customer_only":
      return gates.requireCustomer(principal);
    case "staff":
      return gates.requireStaff(principal);
    case "admin":
      return gates.requireAdmin(principal);
    case "manager":
      return gates.requireManager(principal);
    case "inventory":
      return gates.requireInventoryRole(principal);
    case "order_management":
      return gates.requireOrderManagementRole(principal);
    case "customer":
      return gates.requireAuthenticated(principal);
    default: {
      const _never: never = policy;
      return _never;
    }
  }
}

export function principalUserId(principal: Principal): string | undefined {
  return principal.type === "anonymous" ? undefined : principal.userId;
}

export function toPrincipalDto(principal: Principal) {
  if (principal.type === "anonymous") {
    return { type: "anonymous" as const };
  }
  if (principal.type === "customer") {
    return { type: "customer" as const, userId: principal.userId };
  }
  return {
    type: "staff" as const,
    userId: principal.userId,
    roles: principal.roles,
  };
}
