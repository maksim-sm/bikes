import { interpolate, type MessageVars } from "./interpolate";
import { ru, type Messages } from "./messages/ru";

export type SystemErrorCode = keyof Messages["errors"];
export type NotificationCode = keyof Messages["notifications"];

export function systemMessage(code: string, messages: Messages = ru): string {
  if (code in messages.errors) {
    return messages.errors[code as SystemErrorCode];
  }
  return messages.errors.internal_error;
}

export function productPageTitle(
  brandName: string,
  name: string,
  messages: Messages = ru,
): string {
  return interpolate(messages.meta.productTitle, { brand: brandName, name });
}

export function notificationCopy(
  code: NotificationCode,
  vars: MessageVars = {},
  messages: Messages = ru,
): { title: string; body: string } {
  const entry = messages.notifications[code];
  return {
    title: interpolate(entry.title, vars),
    body: interpolate(entry.body, vars),
  };
}
