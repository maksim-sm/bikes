-- AlterTable
ALTER TABLE "payments" ADD COLUMN "idempotency_key" VARCHAR(160);

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_idempotency_key_key" ON "payments"("provider", "idempotency_key");
