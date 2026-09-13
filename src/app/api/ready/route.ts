import { withRoute } from "@/app/api/_lib/route";
import { UnavailableError } from "@/lib/errors";
import { env } from "@/lib/config";
import { checkReadiness } from "@/lib/readiness";

export const dynamic = "force-dynamic";

/**
 * Readiness for the load balancer. 503 while draining or if PostgreSQL
 * does not answer. Liveness stays on `/api/health`.
 */
export const GET = withRoute("public", async () => {
  const readiness = await checkReadiness();
  if (!readiness.ready) {
    throw new UnavailableError("not ready", { reason: readiness.reason });
  }
  return {
    data: {
      status: "ready",
      environment: env.NODE_ENV,
      ...(env.BUILD_ID !== undefined ? { buildId: env.BUILD_ID } : {}),
    },
  };
});
