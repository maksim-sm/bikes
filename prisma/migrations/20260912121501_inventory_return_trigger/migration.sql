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

  IF NEW.type NOT IN ('RECEIPT', 'ADJUSTMENT', 'RETURN') THEN
    RAISE EXCEPTION 'RESERVE/RELEASE/EXPIRE/COMMIT movements are written by the reservation trigger';
  END IF;

  IF NEW.reservation_id IS NOT NULL THEN
    RAISE EXCEPTION 'receipts, returns, and adjustments are not tied to a reservation';
  END IF;

  IF NEW.type = 'RECEIPT' OR NEW.type = 'RETURN' THEN
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
