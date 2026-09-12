-- Isolated so the new enum value is committed before the trigger uses it.
ALTER TYPE "inventory_movement_type" ADD VALUE 'RETURN';
