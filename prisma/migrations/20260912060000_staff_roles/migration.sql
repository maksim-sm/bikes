-- CreateEnum
CREATE TYPE "staff_role" AS ENUM ('ADMIN', 'MANAGER', 'INVENTORY', 'ORDER_MANAGEMENT');

-- CreateTable
CREATE TABLE "user_staff_roles" (
    "user_id" UUID NOT NULL,
    "role" "staff_role" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_staff_roles_pkey" PRIMARY KEY ("user_id", "role")
);

CREATE INDEX "user_staff_roles_role_idx" ON "user_staff_roles"("role");

ALTER TABLE "user_staff_roles"
  ADD CONSTRAINT "user_staff_roles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
