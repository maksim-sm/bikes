-- Isolated so new enum values are committed before the open-attempt index uses them.
ALTER TYPE "payment_status" ADD VALUE 'CREATED';
ALTER TYPE "payment_status" ADD VALUE 'AUTHORIZED';
ALTER TYPE "payment_status" ADD VALUE 'EXPIRED';
ALTER TYPE "payment_status" ADD VALUE 'REFUND_PENDING';
