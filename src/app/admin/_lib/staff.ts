import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminHref } from "./paths";
import { getAuthServices } from "@/app/api/_lib/compose";
import { usesSecureCookies } from "@/app/api/_lib/csrf";
import { isAppError } from "@/lib/errors";
import {
  SESSION_COOKIE_NAME,
  hasCapability,
  requireCatalogRole,
  requireOrderManagementRole,
  requireStaff,
  type Principal,
  type SessionCookie,
} from "@/modules/identity";

export async function currentPrincipal(): Promise<Principal> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value ?? null;
  return (await getAuthServices()).resolve(token);
}

function redirectStaffAuth(error: unknown): never {
  if (isAppError(error) && error.code === "unauthenticated") {
    redirect(adminHref("/admin/login"));
  }
  redirect(adminHref("/admin/login?forbidden=1"));
}

export async function requireAdminStaff(): Promise<
  Extract<Principal, { type: "staff" }>
> {
  const principal = await currentPrincipal();
  try {
    return requireStaff(principal);
  } catch (error) {
    redirectStaffAuth(error);
  }
}

export async function requireAdminCatalog(): Promise<
  Extract<Principal, { type: "staff" }>
> {
  const principal = await currentPrincipal();
  try {
    return requireCatalogRole(principal);
  } catch (error) {
    redirectStaffAuth(error);
  }
}

export async function requireAdminOrderManagement(): Promise<
  Extract<Principal, { type: "staff" }>
> {
  const principal = await currentPrincipal();
  try {
    return requireOrderManagementRole(principal);
  } catch (error) {
    redirectStaffAuth(error);
  }
}

export function canManageCatalog(principal: Principal): boolean {
  return hasCapability(principal, "manage_catalog");
}

export function canManageOrders(principal: Principal): boolean {
  return hasCapability(principal, "manage_orders");
}

export function canAccessAdmin(principal: Principal): boolean {
  return canManageCatalog(principal) || canManageOrders(principal);
}

export function adminHomePath(principal: Principal): string {
  if (canManageCatalog(principal)) {
    return "/admin/products";
  }
  if (canManageOrders(principal)) {
    return "/admin/deliveries";
  }
  return "/admin/login?forbidden=1";
}

export async function writeSessionCookie(cookie: SessionCookie): Promise<void> {
  const store = await cookies();
  store.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    path: cookie.path,
    secure: cookie.secure,
    maxAge: cookie.maxAge,
  });
}

export function cookieSecurity(): boolean {
  return usesSecureCookies();
}
