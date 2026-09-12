ALTER TABLE "inventory_movements"
  ADD COLUMN "actor_user_id" UUID;

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "inventory_movements_actor_created_at_idx"
  ON "inventory_movements"("actor_user_id", "created_at");
