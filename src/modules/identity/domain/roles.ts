/**
 * Staff job titles. A user may hold more than one. `admin` implies every
 * capability; `manager` covers floor operations (orders + inventory +
 * reading customer records) without being a system administrator.
 */
export const STAFF_ROLES = ["admin", "manager", "inventory", "order_management"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export type Capability =
  | "admin"
  | "manage_orders"
  | "manage_inventory"
  | "read_any_customer";

const ROLE_CAPABILITIES: Record<StaffRole, readonly Capability[]> = {
  admin: ["admin", "manage_orders", "manage_inventory", "read_any_customer"],
  manager: ["manage_orders", "manage_inventory", "read_any_customer"],
  inventory: ["manage_inventory"],
  order_management: ["manage_orders"],
};

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

export function capabilitiesForRoles(roles: readonly StaffRole[]): Set<Capability> {
  const caps = new Set<Capability>();
  for (const role of roles) {
    for (const capability of ROLE_CAPABILITIES[role]) {
      caps.add(capability);
    }
  }
  return caps;
}

export function parseStaffRoles(raw: string | undefined): StaffRole[] {
  if (raw === undefined || raw.length === 0) {
    return [];
  }
  const unique = new Set<StaffRole>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (isStaffRole(trimmed)) {
      unique.add(trimmed);
    }
  }
  return [...unique];
}
