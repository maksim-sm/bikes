import {
  createBearerSessionPort,
  createSessionServices,
  type Principal,
  type SessionServices,
} from "@/modules/identity";

const sessions: SessionServices = createSessionServices({
  sessions: createBearerSessionPort(),
});

export function readBearerToken(headers: Headers): string | null {
  const header = headers.get("authorization");
  if (header === null) {
    return null;
  }
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

export async function resolvePrincipal(headers: Headers): Promise<Principal> {
  return sessions.resolve(readBearerToken(headers));
}

export function enforcePolicy(
  principal: Principal,
  policy: "public" | "customer" | "staff",
): Principal {
  if (policy === "public") {
    return principal;
  }
  if (policy === "staff") {
    return sessions.requireStaff(principal);
  }
  return sessions.requireAuthenticated(principal);
}

export function principalUserId(principal: Principal): string | undefined {
  return principal.type === "anonymous" ? undefined : principal.userId;
}
