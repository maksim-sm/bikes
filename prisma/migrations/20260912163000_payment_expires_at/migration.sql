ALTER TABLE "payments" ADD COLUMN "expires_at" TIMESTAMPTZ(6);

CREATE INDEX "payments_status_expires_at_idx" ON "payments" ("status", "expires_at");
