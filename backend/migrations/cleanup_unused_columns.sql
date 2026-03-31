-- Remove stripe_price_id — replaced by payment_link approach
ALTER TABLE events DROP COLUMN IF EXISTS stripe_price_id;
