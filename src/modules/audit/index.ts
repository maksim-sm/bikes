/**
 * audit module — public entry point.
 *
 * Owns the append-only audit log. Callers pass an AuditContext (actor +
 * request id) from the app boundary; this module never reads cookies.
 */

export {
  prepareAuditRecord,
  type AuditContext,
  type AuditRecord,
  type AuditWrite,
} from "./domain/audit";
export type { AuditRepository } from "./application/ports";
export { createAuditServices, type AuditServices } from "./application/services";
export { createMemoryAuditRepository } from "./infrastructure/memory-audit-repository";
export { createPrismaAuditRepository } from "./infrastructure/prisma-audit-repository";
