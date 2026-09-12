-- Sellable variant identity: status, optional unique barcode, and variant media.
-- SKU uniqueness and (product, size, color, wheel) uniqueness already exist.

CREATE TYPE "variant_status" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "product_variants"
  ADD COLUMN "barcode" VARCHAR(64),
  ADD COLUMN "status" "variant_status" NOT NULL DEFAULT 'ACTIVE';

UPDATE "product_variants"
SET "status" = CASE
  WHEN "is_active" THEN 'ACTIVE'::"variant_status"
  ELSE 'INACTIVE'::"variant_status"
END;

CREATE UNIQUE INDEX "product_variants_barcode_key"
  ON "product_variants"("barcode");

CREATE INDEX "product_variants_product_id_status_idx"
  ON "product_variants"("product_id", "status");

CREATE TABLE "variant_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variant_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "role" "product_media_role" NOT NULL DEFAULT 'GALLERY',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "alt" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "variant_media_variant_id_media_id_key"
  ON "variant_media"("variant_id", "media_id");

CREATE INDEX "variant_media_variant_id_sort_order_idx"
  ON "variant_media"("variant_id", "sort_order");

ALTER TABLE "variant_media"
  ADD CONSTRAINT "variant_media_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "variant_media"
  ADD CONSTRAINT "variant_media_media_id_fkey"
  FOREIGN KEY ("media_id") REFERENCES "media"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION catalog_refresh_product_search(p_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET search_text = COALESCE((
    SELECT concat_ws(
      ' ',
      b.name,
      p.name,
      p.slug,
      p.frame_material,
      p.groupset,
      p.brake_type,
      p.description,
      string_agg(DISTINCT v.sku, ' '),
      string_agg(DISTINCT v.barcode, ' '),
      string_agg(DISTINCT v.color, ' '),
      string_agg(DISTINCT v.frame_size, ' '),
      string_agg(DISTINCT v.wheel_size, ' ')
    )
    FROM products p
    INNER JOIN brands b ON b.id = p.brand_id
    LEFT JOIN product_variants v ON v.product_id = p.id
    WHERE p.id = p_id
    GROUP BY
      b.name,
      p.name,
      p.slug,
      p.frame_material,
      p.groupset,
      p.brake_type,
      p.description
  ), '')
  WHERE id = p_id;
END;
$$;

DROP TRIGGER IF EXISTS product_variants_search_refresh_trg ON product_variants;

CREATE TRIGGER product_variants_search_refresh_trg
  AFTER INSERT OR UPDATE OF sku, barcode, color, frame_size, wheel_size, product_id OR DELETE
  ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION catalog_search_after_variant();

UPDATE products SET name = name;
