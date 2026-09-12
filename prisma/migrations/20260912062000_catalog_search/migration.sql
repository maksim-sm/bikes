-- Indexed catalogue search: stored document + generated tsvector (GIN),
-- plus trigram on the document for SKU / partial model matches.
-- search_text is maintained by triggers (brand, model, SKU, spec copy).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "products"
  ADD COLUMN "search_text" TEXT NOT NULL DEFAULT '';

ALTER TABLE "products"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', search_text)) STORED;

CREATE INDEX "products_search_vector_idx"
  ON "products"
  USING GIN ("search_vector");

CREATE INDEX "products_search_text_trgm_idx"
  ON "products"
  USING GIN ("search_text" gin_trgm_ops);

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

CREATE OR REPLACE FUNCTION catalog_search_after_product()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM catalog_refresh_product_search(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION catalog_search_after_variant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM catalog_refresh_product_search(COALESCE(NEW.product_id, OLD.product_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION catalog_search_after_brand()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  product_row RECORD;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.name IS NOT DISTINCT FROM OLD.name THEN
    RETURN NEW;
  END IF;
  FOR product_row IN SELECT id FROM products WHERE brand_id = NEW.id
  LOOP
    PERFORM catalog_refresh_product_search(product_row.id);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_search_refresh_trg
  AFTER INSERT OR UPDATE OF name, slug, description, frame_material, groupset, brake_type, brand_id
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION catalog_search_after_product();

CREATE TRIGGER product_variants_search_refresh_trg
  AFTER INSERT OR UPDATE OF sku, color, frame_size, wheel_size, product_id OR DELETE
  ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION catalog_search_after_variant();

CREATE TRIGGER brands_search_refresh_trg
  AFTER UPDATE OF name
  ON brands
  FOR EACH ROW
  EXECUTE FUNCTION catalog_search_after_brand();

UPDATE products SET name = name;
