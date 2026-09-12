import { withRoute } from "@/app/api/_lib/route";
import { getCustomerServices } from "@/app/api/_lib/compose";

export const dynamic = "force-dynamic";

export interface ProfileDto {
  firstName: string;
  lastName: string;
  phone: string | null;
}

export const GET = withRoute("customer", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  const profile = await getCustomerServices().getProfile(ctx.principal, userId);
  const data: ProfileDto = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
  };
  return { data };
});
