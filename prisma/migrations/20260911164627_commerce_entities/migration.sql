-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PLACED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "fulfillment_status" AS ENUM ('UNFULFILLED', 'ASSIGNED', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('ASSIGNED', 'SHIPPED', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" VARCHAR(20) NOT NULL,
    "user_id" UUID,
    "status" "order_status" NOT NULL DEFAULT 'PLACED',
    "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "fulfillment_status" "fulfillment_status" NOT NULL DEFAULT 'UNFULFILLED',
    "currency" CHAR(3) NOT NULL DEFAULT 'BYN',
    "subtotal_minor" INTEGER NOT NULL,
    "delivery_cost_minor" INTEGER NOT NULL,
    "total_minor" INTEGER NOT NULL,
    "delivery_method_code" VARCHAR(40) NOT NULL,
    "delivery_method_name" VARCHAR(160) NOT NULL,
    "customer_email" VARCHAR(320) NOT NULL,
    "customer_name" VARCHAR(160) NOT NULL,
    "customer_phone" VARCHAR(32) NOT NULL,
    "shipping_recipient_name" VARCHAR(160) NOT NULL,
    "shipping_phone" VARCHAR(32) NOT NULL,
    "shipping_country_code" CHAR(2) NOT NULL DEFAULT 'BY',
    "shipping_region" VARCHAR(80) NOT NULL,
    "shipping_city" VARCHAR(80) NOT NULL,
    "shipping_street" VARCHAR(160) NOT NULL,
    "shipping_postal_code" VARCHAR(16) NOT NULL,
    "placed_snapshot" JSONB NOT NULL,
    "placed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" VARCHAR(240),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "brand_name" VARCHAR(160) NOT NULL,
    "frame_size" VARCHAR(16) NOT NULL,
    "color" VARCHAR(80) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "line_total_minor" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "provider_payment_id" VARCHAR(120),
    "amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BYN',
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "failure_code" VARCHAR(80),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "provider_event_id" VARCHAR(120) NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "data" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BYN',
    "status" "refund_status" NOT NULL DEFAULT 'PENDING',
    "reason" VARCHAR(240),
    "provider_refund_id" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_methods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_method_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "region" VARCHAR(80) NOT NULL,
    "city" VARCHAR(80) NOT NULL DEFAULT '',
    "cost_minor" INTEGER NOT NULL,
    "estimated_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "delivery_method_id" UUID NOT NULL,
    "delivery_zone_id" UUID,
    "status" "delivery_status" NOT NULL DEFAULT 'ASSIGNED',
    "cost_minor" INTEGER NOT NULL,
    "tracking_number" VARCHAR(80),
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipped_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");

-- CreateIndex
CREATE INDEX "orders_user_id_placed_at_idx" ON "orders"("user_id", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_status_placed_at_idx" ON "orders"("status", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_payment_status_placed_at_idx" ON "orders"("payment_status", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_fulfillment_status_placed_at_idx" ON "orders"("fulfillment_status", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_placed_at_idx" ON "orders"("placed_at" DESC);

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_variant_id_idx" ON "order_items"("product_variant_id");

-- CreateIndex
CREATE INDEX "payments_order_id_created_at_idx" ON "payments"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE INDEX "payment_events_payment_id_created_at_idx" ON "payment_events"("payment_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_provider_event_id_key" ON "payment_events"("provider", "provider_event_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "refunds_order_id_created_at_idx" ON "refunds"("order_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_refund_id_key" ON "refunds"("provider_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_methods_code_key" ON "delivery_methods"("code");

-- CreateIndex
CREATE INDEX "delivery_zones_method_id_is_active_idx" ON "delivery_zones"("delivery_method_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zones_method_region_city_key" ON "delivery_zones"("delivery_method_id", "region", "city");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");

-- CreateIndex
CREATE INDEX "deliveries_status_assigned_at_idx" ON "deliveries"("status", "assigned_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_method_code_fkey" FOREIGN KEY ("delivery_method_code") REFERENCES "delivery_methods"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_delivery_method_id_fkey" FOREIGN KEY ("delivery_method_id") REFERENCES "delivery_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_delivery_method_id_fkey" FOREIGN KEY ("delivery_method_id") REFERENCES "delivery_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Constraints Prisma cannot express in schema.prisma.
-- ---------------------------------------------------------------------------

CREATE SEQUENCE "order_number_seq";

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_money_nonnegative_chk"
  CHECK ("subtotal_minor" >= 0 AND "delivery_cost_minor" >= 0 AND "total_minor" >= 0);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_currency_byn_chk"
  CHECK ("currency" = 'BYN');

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_cancelled_consistency_chk"
  CHECK (
    ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL)
    OR ("status" <> 'CANCELLED' AND "cancelled_at" IS NULL)
  );

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_completed_consistency_chk"
  CHECK (
    ("status" = 'COMPLETED' AND "completed_at" IS NOT NULL)
    OR ("status" <> 'COMPLETED' AND "completed_at" IS NULL)
  );

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive_chk"
  CHECK ("quantity" > 0);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_money_nonnegative_chk"
  CHECK ("unit_price_minor" >= 0 AND "line_total_minor" >= 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_positive_chk"
  CHECK ("amount_minor" > 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_currency_byn_chk"
  CHECK ("currency" = 'BYN');

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_failure_code_chk"
  CHECK (
    ("status" = 'FAILED' AND "failure_code" IS NOT NULL)
    OR ("status" <> 'FAILED')
  );

CREATE UNIQUE INDEX "payments_one_pending_per_order_uidx"
  ON "payments" ("order_id")
  WHERE "status" = 'PENDING';

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_amount_positive_chk"
  CHECK ("amount_minor" > 0);

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_currency_byn_chk"
  CHECK ("currency" = 'BYN');

ALTER TABLE "delivery_zones"
  ADD CONSTRAINT "delivery_zones_cost_nonnegative_chk"
  CHECK ("cost_minor" >= 0);

ALTER TABLE "delivery_zones"
  ADD CONSTRAINT "delivery_zones_estimated_days_positive_chk"
  CHECK ("estimated_days" > 0);

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_cost_nonnegative_chk"
  CHECK ("cost_minor" >= 0);

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_shipped_consistency_chk"
  CHECK (
    ("status" IN ('SHIPPED', 'DELIVERED') AND "shipped_at" IS NOT NULL)
    OR ("status" NOT IN ('SHIPPED', 'DELIVERED'))
  );

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_delivered_consistency_chk"
  CHECK (
    ("status" = 'DELIVERED' AND "delivered_at" IS NOT NULL)
    OR ("status" <> 'DELIVERED' AND "delivered_at" IS NULL)
  );

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_failed_consistency_chk"
  CHECK (
    ("status" = 'FAILED' AND "failed_at" IS NOT NULL)
    OR ("status" <> 'FAILED' AND "failed_at" IS NULL)
  );
