export type MessageVars = Record<string, string | number>;

/** Replaces `{name}` tokens. Unknown keys stay in the string so missing copy is visible. */
export function interpolate(template: string, vars: MessageVars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}
