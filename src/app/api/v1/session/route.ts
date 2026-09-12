import { toPrincipalDto } from "@/app/api/_lib/auth";
import { withRoute } from "@/app/api/_lib/route";

export const dynamic = "force-dynamic";

export const GET = withRoute("public", async (ctx) => ({
  data: toPrincipalDto(ctx.principal),
}));
