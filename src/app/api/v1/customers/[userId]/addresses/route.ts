import { withRoute } from "@/app/api/_lib/route";
import { getCustomerServices } from "@/app/api/_lib/compose";

export const dynamic = "force-dynamic";

export interface AddressDto {
  id: string;
  label: string;
  recipientName: string;
  city: string;
  region: string;
  street: string;
  postalCode: string;
  isDefault: boolean;
}

export const GET = withRoute("customer", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  const addresses = await getCustomerServices().listAddresses(ctx.principal, userId);
  return {
    data: addresses.map(
      (address): AddressDto => ({
        id: address.id,
        label: address.label,
        recipientName: address.recipientName,
        city: address.city,
        region: address.region,
        street: address.street,
        postalCode: address.postalCode,
        isDefault: address.isDefault,
      }),
    ),
  };
});
