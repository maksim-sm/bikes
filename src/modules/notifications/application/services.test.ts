import { describe, expect, it } from "vitest";
import {
  clipNotificationError,
  notificationEventsForPaymentStatus,
  notificationIdempotencyKey,
  sanitizeNotificationPayload,
} from "../domain/notification";
import {
  createCapturingEmailChannel,
  createFailingEmailChannel,
} from "../infrastructure/email-channel";
import { createMemoryNotificationRepository } from "../infrastructure/memory-notifications";
import { createNotificationServices } from "./services";

function services(channel = createCapturingEmailChannel()) {
  const notifications = createMemoryNotificationRepository();
  return {
    notifications,
    channel,
    notify: createNotificationServices({ notifications, channel }),
  };
}

describe("notification payload hygiene", () => {
  it("drops secret-looking keys and redacts token query values", () => {
    expect(
      sanitizeNotificationPayload({
        name: "Ира",
        resetToken: "should-not-store",
        urlToken: "also-secret",
        number: "B-1",
      }),
    ).toEqual({ name: "Ира", number: "B-1" });
    expect(clipNotificationError(new Error("https://x/?token=abc&x=1"))).toContain(
      "token=redacted",
    );
    expect(clipNotificationError(new Error("https://x/?token=abc&x=1"))).not.toContain(
      "abc",
    );
  });

  it("maps payment statuses onto the transactional events", () => {
    expect(notificationEventsForPaymentStatus("CREATED")).toEqual(["payment.pending"]);
    expect(notificationEventsForPaymentStatus("AUTHORIZED")).toEqual(["payment.pending"]);
    expect(notificationEventsForPaymentStatus("SUCCEEDED")).toEqual([
      "payment.successful",
    ]);
    expect(notificationEventsForPaymentStatus("EXPIRED")).toEqual(["payment.failed"]);
    expect(notificationEventsForPaymentStatus("REFUND_PENDING")).toEqual([
      "refund.initiated",
    ]);
    expect(notificationEventsForPaymentStatus("REFUNDED")).toEqual([
      "refund.initiated",
      "refund.completed",
    ]);
  });

  it("lets password reset repeat while other events share one key", () => {
    expect(notificationIdempotencyKey("order.created", "order", "o1")).toBe(
      "order.created:order:o1",
    );
    const first = notificationIdempotencyKey("password.reset", "user", "u1", "a");
    const second = notificationIdempotencyKey("password.reset", "user", "u1", "b");
    expect(first).not.toBe(second);
  });
});

describe("notification dispatch", () => {
  it("records a SENT attempt after the channel accepts the message", async () => {
    const { notify, channel } = services();
    const sent = await notify.dispatch({
      event: "order.created",
      entityType: "order",
      entityId: "o1",
      recipientEmail: "ira@example.by",
      payload: { name: "Ира", number: "B-1", totalMinor: 4500 },
    });
    expect(sent?.status).toBe("SENT");
    expect(sent?.attempts).toHaveLength(1);
    expect(sent?.attempts[0]?.status).toBe("SENT");
    expect(channel.sent[0]).toMatchObject({
      event: "order.created",
      recipientEmail: "ira@example.by",
    });
    const listed = await notify.listByEntity("order", "o1");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.idempotencyKey).toBe("order.created:order:o1");
  });

  it("stores FAILED when the channel throws and never raises to the caller", async () => {
    const notify = createNotificationServices({
      notifications: createMemoryNotificationRepository(),
      channel: createFailingEmailChannel("smtp_unavailable"),
    });
    const failed = await notify.dispatch({
      event: "order.created",
      entityType: "order",
      entityId: "o1",
      recipientEmail: "ira@example.by",
      payload: { number: "B-1" },
    });
    expect(failed?.status).toBe("FAILED");
    expect(failed?.lastError).toBe("smtp_unavailable");
    expect(failed?.attempts).toHaveLength(1);
    expect(failed?.attempts[0]?.status).toBe("FAILED");
  });

  it("does not resend a SENT row and retries a FAILED one", async () => {
    const capturing = createCapturingEmailChannel();
    const repo = createMemoryNotificationRepository();
    const first = createNotificationServices({
      notifications: repo,
      channel: createFailingEmailChannel(),
    });
    await first.dispatch({
      event: "payment.pending",
      entityType: "payment",
      entityId: "p1",
      recipientEmail: "ira@example.by",
    });
    const retry = createNotificationServices({ notifications: repo, channel: capturing });
    const recovered = await retry.dispatch({
      event: "payment.pending",
      entityType: "payment",
      entityId: "p1",
      recipientEmail: "ira@example.by",
    });
    expect(recovered?.status).toBe("SENT");
    expect(recovered?.attempts.map((attempt) => attempt.status)).toEqual([
      "FAILED",
      "SENT",
    ]);
    const again = await retry.dispatch({
      event: "payment.pending",
      entityType: "payment",
      entityId: "p1",
      recipientEmail: "ira@example.by",
    });
    expect(again?.id).toBe(recovered?.id);
    expect(capturing.sent).toHaveLength(1);
  });

  it("keeps the reset token out of the persisted payload", async () => {
    const { notify } = services();
    const sent = await notify.dispatch({
      event: "password.reset",
      entityType: "user",
      entityId: "u1",
      recipientEmail: "ira@example.by",
      payload: { email: "ira@example.by", resetToken: "visible-if-stored" },
      secret: { urlToken: "one-time-secret" },
    });
    expect(sent?.status).toBe("SENT");
    expect(sent?.payload).toEqual({ email: "ira@example.by" });
    expect(JSON.stringify(sent)).not.toContain("one-time-secret");
    expect(JSON.stringify(sent)).not.toContain("visible-if-stored");
  });
});
