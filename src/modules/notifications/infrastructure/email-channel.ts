import { logger } from "@/lib/logger";
import {
  emailActionUrl,
  emailHtml,
  formatPrice,
  renderEmail,
  t,
  type EmailKind,
} from "@/lib/i18n";
import type { NotificationChannel } from "../application/ports";
import type { NotificationEvent } from "../domain/notification";

const EMAIL_KIND: Record<NotificationEvent, EmailKind> = {
  "order.created": "orderCreated",
  "payment.pending": "paymentPending",
  "payment.successful": "paymentSuccessful",
  "payment.failed": "paymentFailed",
  "order.processing": "orderProcessing",
  "order.shipped": "orderShipped",
  "order.delivered": "orderDelivered",
  "order.cancelled": "orderCancelled",
  "refund.initiated": "refundInitiated",
  "refund.completed": "refundCompleted",
  "password.reset": "passwordReset",
};

export function createLoggingEmailChannel(): NotificationChannel {
  return {
    async send(input) {
      const vars: Record<string, string | number> = {
        shop: t.site.name,
        zone: t.time.zoneMinsk,
        ...input.payload,
      };
      if (typeof input.payload.totalMinor === "number") {
        const money = formatPrice(input.payload.totalMinor);
        vars.total = money;
        vars.amount = money;
      }
      if (input.event === "password.reset" && input.secret?.urlToken) {
        vars.url = emailActionUrl("passwordReset", input.secret.urlToken);
      }
      const rendered = renderEmail(EMAIL_KIND[input.event], vars);
      logger.info("notification.email.queued", {
        event: input.event,
        email: input.recipientEmail,
        subject: rendered.subject,
      });
      void emailHtml(rendered);
    },
  };
}

export function createCapturingEmailChannel(): NotificationChannel & {
  sent: Array<{
    event: NotificationEvent;
    recipientEmail: string;
    payload: Record<string, string | number>;
    hasToken: boolean;
  }>;
} {
  const sent: Array<{
    event: NotificationEvent;
    recipientEmail: string;
    payload: Record<string, string | number>;
    hasToken: boolean;
  }> = [];
  return {
    sent,
    async send(input) {
      sent.push({
        event: input.event,
        recipientEmail: input.recipientEmail,
        payload: input.payload,
        hasToken: Boolean(input.secret?.urlToken),
      });
    },
  };
}

export function createFailingEmailChannel(
  message = "smtp_unavailable",
): NotificationChannel {
  return {
    async send() {
      throw new Error(message);
    },
  };
}
