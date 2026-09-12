export interface CustomerProfile {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  countryCode: string;
  region: string;
  city: string;
  street: string;
  postalCode: string;
  isDefault: boolean;
}

export function assertProfileNames(firstName: string, lastName: string): void {
  if (firstName.trim().length === 0 || lastName.trim().length === 0) {
    throw new Error("profile_name_required");
  }
}

export function withSingleDefault(
  addresses: readonly Address[],
  defaultId: string,
): Address[] {
  if (!addresses.some((address) => address.id === defaultId)) {
    throw new Error("address_not_found");
  }
  return addresses.map((address) => ({
    ...address,
    isDefault: address.id === defaultId,
  }));
}

export function prepareNewAddress(
  addresses: readonly Address[],
  incoming: Address,
): Address[] {
  if (incoming.isDefault || addresses.length === 0) {
    return [
      ...addresses.map((address) => ({ ...address, isDefault: false })),
      { ...incoming, isDefault: true },
    ];
  }
  return [...addresses, incoming];
}
