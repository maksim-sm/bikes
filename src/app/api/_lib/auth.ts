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

export async function resolvePrincipal(headers: Headers): Promise<Principal> {
  const auth = await getAuthServices();
  return auth.resolve(readCookieValue(headers.get("cookie"), SESSION_COOKIE_NAME));
}

export function enforcePolicy(
  principal: Principal,
  policy: "public" | "customer" | "staff",
): Principal {
  if (policy === "public") {
    return principal;
  }
  if (policy === "staff") {
    return gates.requireStaff(principal);
  }
  return gates.requireAuthenticated(principal);
}

export function principalUserId(principal: Principal): string | undefined {
  return principal.type === "anonymous" ? undefined : principal.userId;
}
