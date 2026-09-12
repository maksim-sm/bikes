import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminHref } from "./paths";
import { canAccessAdmin } from "./access";
import { getAuthServices } from "@/app/api/_lib/compose";
import { usesSecureCookies } from "@/app/api/_lib/csrf";
import { isAppError } from "@/lib/errors";
import {
  SESSION_COOKIE_NAME,
  requireCatalogRole,
  requireInventoryRole,
  requireOrderManagementRole,
  requireStaff,
  type Principal,
  type SessionCookie,
} from "@/modules/identity";

export {
  adminHomePath,
  canAccessAdmin,
  canManageCatalog,
  canManageInventory,
  canManageOrders,
  visibleAdminNav,
} from "./access";

export async function currentPrincipal(): Promise<Principal> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value ?? null;
  return (await getAuthServices()).resolve(token);
}

function redirectStaffAuth(error: unknown, principal: Principal): never {
  if (isAppError(error) && error.code === "unauthenticated") {
    redirect(adminHref("/admin/login"));
  }
  if (principal.type === "staff" && canAccessAdmin(principal)) {
    redirect(adminHref("/admin/forbidden"));
  }
  redirect(adminHref("/admin/login?forbidden=1"));
}

export async function requireAdminStaff(): Promise<
  Extract<Principal, { type: "staff" }>
> {
  const principal = await currentPrincipal();
  try {
    const staff = requireStaff(principal);
    if (!canAccessAdmin(staff)) {
      redirect(adminHref("/admin/login?forbidden=1"));
    }
    return staff;
  } catch (error) {
    redirectStaffAuth(error, principal);
  }
}

export async function requireAdminCatalog(): Promise<
  Extract<Principal, { type: "staff" }>
> {
  const principal = await currentPrincipal();
  try {
    return requireCatalogRole(principal);
  } catch (error) {
    redirectStaffAuth(error, principal);
  }
}

export async function requireAdminOrderManagement(): Promise<
  Extract<Principal, { type: "staff" }>
> {
  const principal = await currentPrincipal();
  try {
    return requireOrderManagementRole(principal);
  } catch (error) {
    redirectStaffAuth(error, principal);
  }
}

export async function requireAdminInventory(): Promise<
  Extract<Principal, { type: "staff" }>
> {
  const principal = await currentPrincipal();
  try {
    return requireInventoryRole(principal);
  } catch (error) {
    redirectStaffAuth(error, principal);
  }
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
