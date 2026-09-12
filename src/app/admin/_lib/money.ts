export function parsePriceBynToMinor(value: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match?.[1]) {
    return null;
  }
  const major = Number(match[1]);
  const minor = Number((match[2] ?? "00").padEnd(2, "0"));
  if (!Number.isInteger(major) || !Number.isInteger(minor)) {
    return null;
  }
  return major * 100 + minor;
}

export function minorToBynInput(amountMinor: number): string {
  const major = Math.trunc(amountMinor / 100);
  const minor = Math.abs(amountMinor % 100)
    .toString()
    .padStart(2, "0");
  return `${major}.${minor}`;
}
