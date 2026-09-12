import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getAuthServices } from "@/app/api/_lib/compose";
import { clientRateKey } from "@/app/api/_lib/csrf";

const bodySchema = z.object({
  email: z.string().email(),
});

export const dynamic = "force-dynamic";

export const POST = withRoute("public", async (ctx) => {
  const body = parseWithSchema(bodySchema, await ctx.request.json());
  const auth = await getAuthServices();
  const result = await auth.resendVerification({
    email: body.email,
    requestId: ctx.requestId,
    rateKey: clientRateKey(ctx.request, "email-resend"),
  });
  return { data: result };
});
