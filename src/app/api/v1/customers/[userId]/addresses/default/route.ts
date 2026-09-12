import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getCustomerServices } from "@/app/api/_lib/compose";
import { toAddressDto } from "../route";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  addressId: z.string().min(1),
});

export const POST = withRoute("customer_only", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  const body = parseWithSchema(bodySchema, await ctx.request.json());
  const addresses = await getCustomerServices().setDefaultAddress(
    ctx.principal,
    userId,
    body.addressId,
  );
  return { data: addresses.map(toAddressDto) };
});
