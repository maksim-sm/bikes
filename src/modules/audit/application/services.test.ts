import { describe, expect, it } from "vitest";
import { createMemoryAuditRepository } from "../infrastructure/memory-audit-repository";
import { createAuditServices } from "./services";

describe("audit services", () => {
  it("appends an actor and request id onto the entity timeline", async () => {
    const audit = createMemoryAuditRepository();
    const services = createAuditServices({
      audit,
      clock: { now: () => new Date("2026-09-12T16:00:00.000Z") },
    });
    await services.record(
      { actorUserId: "staff-1", requestId: "req-1" },
      {
        action: "catalog.product.publish",
        entityType: "product",
        entityId: "p-emonda",
        after: { status: "PUBLISHED" },
      },
    );
    const rows = await audit.listByEntity("product", "p-emonda");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorUserId: "staff-1",
      requestId: "req-1",
      action: "catalog.product.publish",
      entityId: "p-emonda",
    });
  });
});
