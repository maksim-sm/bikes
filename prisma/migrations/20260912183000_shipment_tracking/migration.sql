ALTER TABLE "deliveries"
  ADD COLUMN "carrier_name" VARCHAR(80),
  ADD COLUMN "tracking_url" VARCHAR(500),
  ADD COLUMN "notes" TEXT;
