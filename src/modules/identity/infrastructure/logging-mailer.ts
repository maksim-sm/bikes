import { emailActionUrl, renderEmail, t } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import type { AuthMailer } from "../application/auth-ports";

/**
 * Development mailer. Renders catalogue copy and logs the subject, never
 * the raw token or the action URL that contains it.
 */
export function createLoggingMailer(): AuthMailer {
  return {
    async sendEmailVerification(input) {
      const rendered = renderEmail("verify", {
        shop: t.site.name,
        email: input.email,
        url: emailActionUrl("verify", input.rawToken),
      });
      logger.info("auth.email.verification_queued", {
        email: input.email,
        subject: rendered.subject,
      });
    },
    async sendPasswordReset(input) {
      const rendered = renderEmail("passwordReset", {
        shop: t.site.name,
        email: input.email,
        url: emailActionUrl("passwordReset", input.rawToken),
      });
      logger.info("auth.email.password_reset_queued", {
        email: input.email,
        subject: rendered.subject,
      });
    },
  };
}

export function createCapturingMailer(): AuthMailer & {
  verifications: { email: string; rawToken: string }[];
  resets: { email: string; rawToken: string }[];
} {
  const verifications: { email: string; rawToken: string }[] = [];
  const resets: { email: string; rawToken: string }[] = [];
  return {
    verifications,
    resets,
    async sendEmailVerification(input) {
      verifications.push(input);
    },
    async sendPasswordReset(input) {
      resets.push(input);
    },
  };
}
