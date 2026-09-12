import { logger } from "@/lib/logger";
import type { AuthMailer } from "../application/auth-ports";

/**
 * Development mailer. Logs that mail was queued, never the raw token.
 * Replace with a provider adapter when an email vendor is chosen.
 */
export function createLoggingMailer(): AuthMailer {
  return {
    async sendEmailVerification(input) {
      logger.info("auth.email.verification_queued", { email: input.email });
    },
    async sendPasswordReset(input) {
      logger.info("auth.email.password_reset_queued", { email: input.email });
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
