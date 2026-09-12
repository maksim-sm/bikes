import { ForbiddenError, UnauthenticatedError } from "@/lib/errors";
import {
  actorUserId,
  isAuthenticated,
  isStaff,
  parseBearerPrincipal,
  type Principal,
} from "../domain/principal";

export interface SessionPort {
  resolve(token: string | null): Promise<Principal>;
}

export interface SessionServices {
  resolve(token: string | null): Promise<Principal>;
  requireAuthenticated(
    principal: Principal,
  ): Extract<Principal, { type: "customer" | "staff" }>;
  requireStaff(principal: Principal): Extract<Principal, { type: "staff" }>;
}

export function createSessionServices(deps: { sessions: SessionPort }): SessionServices {
  return {
    async resolve(token) {
      return deps.sessions.resolve(token);
    },
    requireAuthenticated(principal) {
      if (!isAuthenticated(principal)) {
        throw new UnauthenticatedError("authentication required");
      }
      return principal;
    },
    requireStaff(principal) {
      if (!isAuthenticated(principal)) {
        throw new UnauthenticatedError("authentication required");
      }
      if (!isStaff(principal)) {
        throw new ForbiddenError("staff role required");
      }
      return principal;
    },
  };
}

export function createBearerSessionPort(): SessionPort {
  return {
    async resolve(token) {
      return parseBearerPrincipal(token);
    },
  };
}

export { actorUserId };
