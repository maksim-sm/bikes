import { withRoute } from "@/app/api/_lib/route";

export const dynamic = "force-dynamic";

export const GET = withRoute("public", async (ctx) => ({
  data:
    ctx.principal.type === "anonymous"
      ? { type: "anonymous" as const }
      : { type: ctx.principal.type, userId: ctx.principal.userId },
}));
