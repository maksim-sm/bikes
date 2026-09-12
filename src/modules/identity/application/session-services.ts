import {
  requireAdmin,
  requireAnonymous,
  requireAuthenticated,
  requireCustomer,
  requireInventoryRole,
  requireManager,
  requireOrderManagementRole,
  requireStaff,
} from "./authorization";
import { actorUserId, parseBearerPrincipal, type Principal } from "../domain/principal";

export interface SessionPort {
  resolve(token: string | null): Promise<Principal>;
}

export interface SessionServices {
  resolve(token: string | null): Promise<Principal>;
  requireAnonymous(principal: Principal): Extract<Principal, { type: "anonymous" }>;
  requireCustomer(principal: Principal): Extract<Principal, { type: "customer" }>;
  requireAuthenticated(
    principal: Principal,
  ): Extract<Principal, { type: "customer" | "staff" }>;
  requireStaff(principal: Principal): Extract<Principal, { type: "staff" }>;
  requireAdmin(principal: Principal): Extract<Principal, { type: "staff" }>;
  requireManager(principal: Principal): Extract<Principal, { type: "staff" }>;
  requireInventoryRole(principal: Principal): Extract<Principal, { type: "staff" }>;
  requireOrderManagementRole(principal: Principal): Extract<Principal, { type: "staff" }>;
}

export function createSessionServices(deps: { sessions: SessionPort }): SessionServices {
  return {
    async resolve(token) {
      return deps.sessions.resolve(token);
    },
    requireAnonymous,
    requireCustomer,
    requireAuthenticated,
    requireStaff,
    requireAdmin,
    requireManager,
    requireInventoryRole,
    requireOrderManagementRole,
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
