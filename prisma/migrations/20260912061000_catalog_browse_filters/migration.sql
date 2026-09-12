-- CreateEnum
CREATE TYPE "bicycle_type" AS ENUM ('ROAD', 'MTB', 'GRAVEL', 'CITY', 'KIDS');

-- AlterTable
ALTER TABLE "products"
  ADD COLUMN "bicycle_type" "bicycle_type" NOT NULL DEFAULT 'ROAD',
  ADD COLUMN "frame_material" VARCHAR(80),
  ADD COLUMN "groupset" VARCHAR(80),
  ADD COLUMN "brake_type" VARCHAR(40);

ALTER TABLE "products" ALTER COLUMN "bicycle_type" DROP DEFAULT;

CREATE INDEX "products_bicycle_type_status_idx" ON "products"("bicycle_type", "status");
CREATE INDEX "products_frame_material_idx" ON "products"("frame_material");
CREATE INDEX "products_groupset_idx" ON "products"("groupset");

-- AlterTable
ALTER TABLE "product_variants"
  ADD COLUMN "wheel_size" VARCHAR(16) NOT NULL DEFAULT '28';

ALTER TABLE "product_variants" ALTER COLUMN "wheel_size" DROP DEFAULT;

ALTER TABLE "product_variants"
  DROP CONSTRAINT "product_variants_product_id_frame_size_color_key";

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_product_id_size_color_key"
  UNIQUE ("product_id", "frame_size", "color", "wheel_size");

CREATE INDEX "product_variants_frame_size_idx" ON "product_variants"("frame_size");
CREATE INDEX "product_variants_wheel_size_idx" ON "product_variants"("wheel_size");
CREATE INDEX "product_variants_list_price_minor_idx" ON "product_variants"("list_price_minor");
