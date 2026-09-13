-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event" VARCHAR(40) NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_id" VARCHAR(80) NOT NULL,
    "recipient_email" VARCHAR(320) NOT NULL,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'email',
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" VARCHAR(160) NOT NULL,
    "payload" JSONB NOT NULL,
    "last_error" VARCHAR(240),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_id" UUID NOT NULL,
    "status" "notification_status" NOT NULL,
    "error" VARCHAR(240),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "notifications_entity_created_at_idx" ON "notifications"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_event_status_created_at_idx" ON "notifications"("event", "status", "created_at");

-- CreateIndex
CREATE INDEX "notification_attempts_notification_created_at_idx" ON "notification_attempts"("notification_id", "created_at");

-- AddForeignKey
ALTER TABLE "notification_attempts" ADD CONSTRAINT "notification_attempts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
