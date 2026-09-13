import { ru, type Messages } from "./messages/ru";

interface ZodIssueLike {
  code: string;
  path: readonly PropertyKey[];
  message?: string;
}

/**
 * Maps a Zod issue to catalogue copy. Field names stay in `path`; the
 * customer-facing sentence is Russian and locale-swappable.
 */
export function zodIssueMessage(
  issue: ZodIssueLike,
  messages: Messages = ru,
): string {
  switch (issue.code) {
    case "invalid_type":
    case "invalid_value":
      return messages.validation.invalidType;
    case "too_small":
      return messages.validation.tooSmall;
    case "too_big":
      return messages.validation.tooBig;
    case "invalid_format":
      if (issue.message?.toLowerCase().includes("email")) {
        return messages.validation.invalidEmail;
      }
      if (issue.message?.toLowerCase().includes("url")) {
        return messages.validation.invalidUrl;
      }
      return messages.validation.invalid;
    default:
      return messages.validation.invalid;
  }
}
