import { env } from "@/lib/config";
import { withRoute } from "@/app/api/_lib/route";
import { isDraining } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

/**
 * Liveness for the deployment platform. Stays 200 while draining so a
 * probe does not kill the process mid-shutdown. Readiness is `/api/ready`.
 */
export const GET = withRoute("public", async () => ({
  data: {
    status: "ok",
    environment: env.NODE_ENV,
    draining: isDraining(),
    time: new Date().toISOString(),
    ...(env.BUILD_ID !== undefined ? { buildId: env.BUILD_ID } : {}),
  },
}));
