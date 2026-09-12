import { env } from "@/lib/config";
import { withRoute } from "@/app/api/_lib/route";

export const dynamic = "force-dynamic";

/**
 * Liveness for the deployment platform. Uses the same envelope and request-id
 * rules as `/api/v1/*`.
 */
export const GET = withRoute("public", async () => ({
  data: {
    status: "ok",
    environment: env.NODE_ENV,
    time: new Date().toISOString(),
  },
}));
