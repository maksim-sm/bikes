-- Inventory ledger. `stock_qty` on product_variants is replaced by a unique
-- inventory_items row per variant. Reservation/release/commit/expire are
-- applied by triggers so concurrent checkouts cannot oversell.

-- CreateEnum
CREATE TYPE "inventory_reservation_status" AS ENUM ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "inventory_movement_type" AS ENUM ('RECEIPT', 'ADJUSTMENT', 'RESERVE', 'RELEASE', 'EXPIRE', 'COMMIT');

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_variant_id" UUID NOT NULL,
    "on_hand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_items_on_hand_nonnegative_chk" CHECK ("on_hand" >= 0),
    CONSTRAINT "inventory_items_reserved_nonnegative_chk" CHECK ("reserved" >= 0),
    CONSTRAINT "inventory_items_reserved_le_on_hand_chk" CHECK ("reserved" <= "on_hand")
);

ALTER TABLE "inventory_items"
  ADD COLUMN "available" INTEGER GENERATED ALWAYS AS ("on_hand" - "reserved") STORED;

-- Backfill from the column this migration drops.
INSERT INTO "inventory_items" ("product_variant_id", "on_hand", "reserved")
SELECT "id", "stock_qty", 0 FROM "product_variants";

ALTER TABLE "product_variants" DROP COLUMN "stock_qty";

CREATE TABLE "inventory_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventory_item_id" UUID NOT NULL,
    "cart_id" UUID,
    "order_id" UUID,
    "quantity" INTEGER NOT NULL,
    "status" "inventory_reservation_status" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "released_at" TIMESTAMPTZ(6),
    "committed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_reservations_quantity_positive_chk" CHECK ("quantity" > 0),
    CONSTRAINT "inventory_reservations_released_consistency_chk" CHECK (
      ("status" = 'RELEASED' AND "released_at" IS NOT NULL)
      OR ("status" <> 'RELEASED' AND "released_at" IS NULL)
    ),
    CONSTRAINT "inventory_reservations_committed_consistency_chk" CHECK (
      ("status" = 'COMMITTED' AND "committed_at" IS NOT NULL)
      OR ("status" <> 'COMMITTED' AND "committed_at" IS NULL)
    )
);

CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventory_item_id" UUID NOT NULL,
    "reservation_id" UUID,
    "type" "inventory_movement_type" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "on_hand_after" INTEGER NOT NULL,
    "reserved_after" INTEGER NOT NULL,
    "note" VARCHAR(240),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_movements_quantity_positive_chk" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "inventory_items_product_variant_id_key"
  ON "inventory_items"("product_variant_id");

CREATE INDEX "inventory_reservations_item_status_idx"
  ON "inventory_reservations"("inventory_item_id", "status");

CREATE INDEX "inventory_reservations_order_id_idx"
  ON "inventory_reservations"("order_id");

-- Expiry worker: find ACTIVE rows whose clock has run out, without a seq scan.
CREATE INDEX "inventory_reservations_active_expires_at_idx"
  ON "inventory_reservations"("expires_at")
  WHERE "status" = 'ACTIVE';

-- One live hold per variant per cart (quantity changes are a new reservation
-- after release, or a commit, not an in-place qty edit).
CREATE UNIQUE INDEX "inventory_reservations_one_active_per_cart_item_uidx"
  ON "inventory_reservations"("inventory_item_id", "cart_id")
  WHERE "status" = 'ACTIVE' AND "cart_id" IS NOT NULL;

CREATE UNIQUE INDEX "inventory_reservations_one_active_per_order_item_uidx"
  ON "inventory_reservations"("inventory_item_id", "order_id")
  WHERE "status" = 'ACTIVE' AND "order_id" IS NOT NULL;

CREATE INDEX "inventory_movements_item_created_at_idx"
  ON "inventory_movements"("inventory_item_id", "created_at");

CREATE INDEX "inventory_movements_reservation_id_idx"
  ON "inventory_movements"("reservation_id");

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_cart_id_fkey"
  FOREIGN KEY ("cart_id") REFERENCES "carts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_reservation_id_fkey"
  FOREIGN KEY ("reservation_id") REFERENCES "inventory_reservations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Race-safe reservation: the UPDATE ... WHERE available >= qty serialises
-- concurrent checkouts on the inventory_items row. Application code that
-- computes reserved in process memory is not the source of truth.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_write_movement(
  p_item_id UUID,
  p_reservation_id UUID,
  p_type inventory_movement_type,
  p_quantity INTEGER,
  p_on_hand INTEGER,
  p_reserved INTEGER,
  p_note VARCHAR
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('inventory.internal', '1', true);
  INSERT INTO inventory_movements (
    inventory_item_id, reservation_id, type, quantity, on_hand_after, reserved_after, note
  ) VALUES (
    p_item_id, p_reservation_id, p_type, p_quantity, p_on_hand, p_reserved, p_note
  );
  PERFORM set_config('inventory.internal', '', true);
END;
$$;

-- BEFORE INSERT/UPDATE mutates NEW and the inventory_items row (row lock).
-- AFTER INSERT/UPDATE writes the ledger. Movements cannot be written in
-- BEFORE INSERT: the reservation row does not exist yet, so the FK fails.
-- Timestamps cannot be stamped in AFTER UPDATE: CHECK constraints see the
-- row as submitted, and AFTER triggers cannot change stored columns.

CREATE OR REPLACE FUNCTION inventory_reservations_before()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'new reservations must start as ACTIVE';
    END IF;

    UPDATE inventory_items
       SET reserved = reserved + NEW.quantity,
           updated_at = now()
     WHERE id = NEW.inventory_item_id
       AND on_hand - reserved >= NEW.quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient available inventory'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.quantity <> NEW.quantity OR OLD.inventory_item_id <> NEW.inventory_item_id THEN
    RAISE EXCEPTION 'reservation quantity and item cannot be changed; release and reserve again';
  END IF;

  IF OLD.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'terminal reservations cannot change status';
  END IF;

  NEW.updated_at := now();

  IF NEW.status = 'ACTIVE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'RELEASED' THEN
    NEW.released_at := COALESCE(NEW.released_at, now());
  ELSIF NEW.status = 'COMMITTED' THEN
    NEW.committed_at := COALESCE(NEW.committed_at, now());
  END IF;

  IF NEW.status = 'RELEASED' OR NEW.status = 'EXPIRED' THEN
    UPDATE inventory_items
       SET reserved = reserved - OLD.quantity,
           updated_at = now()
     WHERE id = OLD.inventory_item_id
       AND reserved >= OLD.quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'reservation counter mismatch on release/expire';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.status = 'COMMITTED' THEN
    UPDATE inventory_items
       SET reserved = reserved - OLD.quantity,
           on_hand = on_hand - OLD.quantity,
           updated_at = now()
     WHERE id = OLD.inventory_item_id
       AND reserved >= OLD.quantity
       AND on_hand >= OLD.quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'reservation counter mismatch on commit';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid reservation transition % -> %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER inventory_reservations_before_trg
  BEFORE INSERT OR UPDATE ON inventory_reservations
  FOR EACH ROW
  EXECUTE FUNCTION inventory_reservations_before();

CREATE OR REPLACE FUNCTION inventory_reservations_after()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item inventory_items%ROWTYPE;
BEGIN
  SELECT * INTO STRICT item FROM inventory_items WHERE id = NEW.inventory_item_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM inventory_write_movement(
      item.id, NEW.id, 'RESERVE', NEW.quantity, item.on_hand, item.reserved, NULL
    );
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'RELEASED' THEN
    PERFORM inventory_write_movement(
      item.id, NEW.id, 'RELEASE', NEW.quantity, item.on_hand, item.reserved, NULL
    );
  ELSIF NEW.status = 'EXPIRED' THEN
    PERFORM inventory_write_movement(
      item.id, NEW.id, 'EXPIRE', NEW.quantity, item.on_hand, item.reserved, NULL
    );
  ELSIF NEW.status = 'COMMITTED' THEN
    PERFORM inventory_write_movement(
      item.id, NEW.id, 'COMMIT', NEW.quantity, item.on_hand, item.reserved, NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_reservations_after_trg
  AFTER INSERT OR UPDATE ON inventory_reservations
  FOR EACH ROW
  EXECUTE FUNCTION inventory_reservations_after();

CREATE OR REPLACE FUNCTION inventory_reservations_forbid_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'inventory_reservations are not deleted; release, expire, or commit them';
END;
$$;

CREATE TRIGGER inventory_reservations_forbid_delete_trg
  BEFORE DELETE ON inventory_reservations
  FOR EACH ROW
  EXECUTE FUNCTION inventory_reservations_forbid_delete();

-- Receipts and adjustments: the only movements application code may insert.
CREATE OR REPLACE FUNCTION inventory_movements_apply_external()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item inventory_items%ROWTYPE;
BEGIN
  IF current_setting('inventory.internal', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF NEW.type NOT IN ('RECEIPT', 'ADJUSTMENT') THEN
    RAISE EXCEPTION 'RESERVE/RELEASE/EXPIRE/COMMIT movements are written by the reservation trigger';
  END IF;

  IF NEW.reservation_id IS NOT NULL THEN
    RAISE EXCEPTION 'receipts and adjustments are not tied to a reservation';
  END IF;

  IF NEW.type = 'RECEIPT' THEN
    UPDATE inventory_items
       SET on_hand = on_hand + NEW.quantity,
           updated_at = now()
     WHERE id = NEW.inventory_item_id
    RETURNING * INTO item;
  ELSE
    UPDATE inventory_items
       SET on_hand = on_hand - NEW.quantity,
           updated_at = now()
     WHERE id = NEW.inventory_item_id
       AND on_hand - NEW.quantity >= reserved
    RETURNING * INTO item;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'adjustment would drop on-hand below reserved';
    END IF;
  END IF;

  NEW.on_hand_after := item.on_hand;
  NEW.reserved_after := item.reserved;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_movements_apply_external_trg
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION inventory_movements_apply_external();

CREATE OR REPLACE FUNCTION inventory_movements_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'inventory_movements are append-only';
END;
$$;

CREATE TRIGGER inventory_movements_forbid_mutation_trg
  BEFORE UPDATE OR DELETE ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION inventory_movements_forbid_mutation();

-- Every new variant gets an inventory row so uniqueness is structural.
CREATE OR REPLACE FUNCTION inventory_items_for_new_variant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO inventory_items (product_variant_id, on_hand, reserved)
  VALUES (NEW.id, 0, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_items_for_new_variant_trg
  AFTER INSERT ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION inventory_items_for_new_variant();

-- Expire due ACTIVE reservations. Safe to call concurrently: each UPDATE
-- row-locks the reservation, then the item.
CREATE OR REPLACE FUNCTION expire_inventory_reservations(p_as_of TIMESTAMPTZ DEFAULT now())
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  expired INTEGER;
BEGIN
  UPDATE inventory_reservations
     SET status = 'EXPIRED',
         updated_at = p_as_of
   WHERE status = 'ACTIVE'
     AND expires_at <= p_as_of;

  GET DIAGNOSTICS expired = ROW_COUNT;
  RETURN expired;
END;
$$;
