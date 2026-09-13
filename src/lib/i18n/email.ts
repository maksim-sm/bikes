import { env } from "@/lib/config";
import { interpolate, type MessageVars } from "./interpolate";
import { ru, type Messages } from "./messages/ru";

export type EmailKind = keyof Messages["email"];

export interface RenderedEmail {
  kind: EmailKind;
  subject: string;
  preview: string;
  text: string;
}

export function emailActionUrl(
  kind: Extract<EmailKind, "verify" | "passwordReset">,
  rawToken: string,
): string {
  const token = encodeURIComponent(rawToken);
  if (kind === "verify") {
    return `${env.APP_URL}/verify?token=${token}`;
  }
  return `${env.APP_URL}/login?reset=${token}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderEmail(
  kind: EmailKind,
  vars: MessageVars,
  messages: Messages = ru,
): RenderedEmail {
  const template = messages.email[kind];
  const subject = interpolate(template.subject, vars);
  const preview = interpolate(template.preview, vars);
  const text = interpolate(template.text, vars);
  return { kind, subject, preview, text };
}

export function emailHtml(rendered: RenderedEmail): string {
  const paragraphs = rendered.text.split("\n\n").map((block) => {
    const html = escapeHtml(block).replaceAll("\n", "<br />");
    return `<p>${html}</p>`;
  });
  return `<!doctype html><html lang="ru"><body>${paragraphs.join("")}</body></html>`;
}
