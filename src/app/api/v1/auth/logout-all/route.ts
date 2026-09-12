import { withRoute } from "@/app/api/_lib/route";
import { getAuthServices } from "@/app/api/_lib/compose";
import { usesSecureCookies } from "@/app/api/_lib/csrf";

export const dynamic = "force-dynamic";

export const POST = withRoute("customer_only", async (ctx) => {
  const result = await (
    await getAuthServices()
  ).logoutAllSessions({
    principal: ctx.principal,
    requestId: ctx.requestId,
    secureCookie: usesSecureCookies(),
  });
  return { data: { ok: true }, cookies: [result.cookie] };
});
