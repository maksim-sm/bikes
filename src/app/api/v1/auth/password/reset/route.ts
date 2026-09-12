import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getAuthServices } from "@/app/api/_lib/compose";
import { clientRateKey } from "@/app/api/_lib/csrf";

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1).max(128),
});

export const dynamic = "force-dynamic";

export const POST = withRoute("public", async (ctx) => {
  const body = parseWithSchema(bodySchema, await ctx.request.json());
  const auth = await getAuthServices();
  const result = await auth.resetPassword({
    rawToken: body.token,
    password: body.password,
    requestId: ctx.requestId,
    rateKey: clientRateKey(ctx.request, "password-reset"),
  });
  return { data: result };
});
