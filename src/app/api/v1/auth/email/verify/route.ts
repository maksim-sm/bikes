import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getAuthServices } from "@/app/api/_lib/compose";

const bodySchema = z.object({
  token: z.string().min(1),
});

export const dynamic = "force-dynamic";

export const POST = withRoute("public", async (ctx) => {
  const body = parseWithSchema(bodySchema, await ctx.request.json());
  const auth = await getAuthServices();
  const result = await auth.verifyEmail({
    rawToken: body.token,
    requestId: ctx.requestId,
  });
  return { data: result };
});
