CREATE TYPE "delivery_kind" AS ENUM ('COURIER', 'PICKUP', 'REGIONAL');

ALTER TABLE "delivery_methods"
  ADD COLUMN "kind" "delivery_kind" NOT NULL DEFAULT 'COURIER',
  ADD COLUMN "pickup_region" VARCHAR(80),
  ADD COLUMN "pickup_city" VARCHAR(80),
  ADD COLUMN "pickup_street" VARCHAR(160),
  ADD COLUMN "pickup_postal_code" VARCHAR(16),
  ADD COLUMN "free_threshold_minor" INTEGER;

ALTER TABLE "delivery_methods" ALTER COLUMN "kind" DROP DEFAULT;

ALTER TABLE "delivery_zones"
  ADD COLUMN "estimated_text" VARCHAR(160) NOT NULL DEFAULT '';

ALTER TABLE "delivery_zones" ALTER COLUMN "estimated_text" DROP DEFAULT;

INSERT INTO "delivery_methods" (
  "id",
  "code",
  "name",
  "kind",
  "pickup_region",
  "pickup_city",
  "pickup_street",
  "pickup_postal_code",
  "free_threshold_minor",
  "is_active"
)
VALUES
  (
    gen_random_uuid(),
    'minsk-courier',
    'Курьер по Минску',
    'COURIER',
    NULL,
    NULL,
    NULL,
    NULL,
    1000000,
    true
  ),
  (
    gen_random_uuid(),
    'minsk-pickup',
    'Самовывоз из магазина',
    'PICKUP',
    'Минск',
    'Минск',
    'пр-т Независимости 95',
    '220012',
    NULL,
    true
  ),
  (
    gen_random_uuid(),
    'by-regional',
    'Доставка по Беларуси',
    'REGIONAL',
    NULL,
    NULL,
    NULL,
    NULL,
    300000,
    true
  )
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "kind" = EXCLUDED."kind",
  "pickup_region" = EXCLUDED."pickup_region",
  "pickup_city" = EXCLUDED."pickup_city",
  "pickup_street" = EXCLUDED."pickup_street",
  "pickup_postal_code" = EXCLUDED."pickup_postal_code",
  "free_threshold_minor" = EXCLUDED."free_threshold_minor",
  "is_active" = EXCLUDED."is_active";

INSERT INTO "delivery_zones" (
  "id",
  "delivery_method_id",
  "name",
  "region",
  "city",
  "cost_minor",
  "estimated_days",
  "estimated_text",
  "is_active"
)
SELECT gen_random_uuid(), "id", 'Минск', 'Минск', 'Минск', 2500, 1, '1 рабочий день', true
FROM "delivery_methods"
WHERE "code" = 'minsk-courier'
ON CONFLICT ("delivery_method_id", "region", "city") DO UPDATE SET
  "name" = EXCLUDED."name",
  "cost_minor" = EXCLUDED."cost_minor",
  "estimated_days" = EXCLUDED."estimated_days",
  "estimated_text" = EXCLUDED."estimated_text",
  "is_active" = EXCLUDED."is_active";

INSERT INTO "delivery_zones" (
  "id",
  "delivery_method_id",
  "name",
  "region",
  "city",
  "cost_minor",
  "estimated_days",
  "estimated_text",
  "is_active"
)
SELECT gen_random_uuid(), "id", 'Магазин в Минске', '', '', 0, 0, 'Можно забрать в день заказа', true
FROM "delivery_methods"
WHERE "code" = 'minsk-pickup'
ON CONFLICT ("delivery_method_id", "region", "city") DO UPDATE SET
  "name" = EXCLUDED."name",
  "cost_minor" = EXCLUDED."cost_minor",
  "estimated_days" = EXCLUDED."estimated_days",
  "estimated_text" = EXCLUDED."estimated_text",
  "is_active" = EXCLUDED."is_active";

INSERT INTO "delivery_zones" (
  "id",
  "delivery_method_id",
  "name",
  "region",
  "city",
  "cost_minor",
  "estimated_days",
  "estimated_text",
  "is_active"
)
SELECT gen_random_uuid(), m."id", z."name", z."region", '', z."cost_minor", z."estimated_days", z."estimated_text", true
FROM "delivery_methods" AS m
CROSS JOIN (
  VALUES
    ('Минская область', 'Минская', 5000, 3, '2–4 рабочих дня'),
    ('Брестская область', 'Брестская', 8000, 5, '3–7 рабочих дней'),
    ('Витебская область', 'Витебская', 9000, 5, '3–7 рабочих дней'),
    ('Гомельская область', 'Гомельская', 9000, 5, '3–7 рабочих дней'),
    ('Гродненская область', 'Гродненская', 8000, 5, '3–7 рабочих дней'),
    ('Могилёвская область', 'Могилёвская', 9000, 5, '3–7 рабочих дней')
) AS z("name", "region", "cost_minor", "estimated_days", "estimated_text")
WHERE m."code" = 'by-regional'
ON CONFLICT ("delivery_method_id", "region", "city") DO UPDATE SET
  "name" = EXCLUDED."name",
  "cost_minor" = EXCLUDED."cost_minor",
  "estimated_days" = EXCLUDED."estimated_days",
  "estimated_text" = EXCLUDED."estimated_text",
  "is_active" = EXCLUDED."is_active";
