import { withRoute } from "@/app/api/_lib/route";
import { loadOpsSnapshot } from "@/app/admin/_lib/ops-snapshot";

export const dynamic = "force-dynamic";

export const GET = withRoute("admin", async (ctx) => {
  const snapshot = await loadOpsSnapshot(ctx.principal);
  return {
    data: {
      notifications: snapshot.notifications.map((row) => ({
        id: row.id,
        event: row.event,
        entityType: row.entityType,
        entityId: row.entityId,
        status: row.status,
        lastError: row.lastError,
        updatedAt: row.updatedAt.toISOString(),
      })),
      inventory: snapshot.inventory,
      orders: snapshot.orders,
    },
  };
});
