import { withRoute } from "@/app/api/_lib/route";
import { getPaymentServices } from "@/app/api/_lib/compose";
import { toPaymentDto } from "../dto";

export const dynamic = "force-dynamic";

/**
 * Browser return landing. Query claims such as `?status=succeeded` are
 * ignored; only a provider poll (or a later webhook) may change status.
 */
export const GET = withRoute(
  "public",
  async (ctx) => {
    const id = ctx.url.pathname.split("/").pop() ?? "";
    const payment = await getPaymentServices().observeReturn(id);
    return { data: toPaymentDto(payment) };
  },
  { csrf: false },
);
