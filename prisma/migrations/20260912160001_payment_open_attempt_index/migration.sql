ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'CREATED';

DROP INDEX IF EXISTS "payments_one_pending_per_order_uidx";

CREATE UNIQUE INDEX "payments_one_open_per_order_uidx"
  ON "payments" ("order_id")
  WHERE "status" IN ('CREATED', 'PENDING', 'AUTHORIZED');
