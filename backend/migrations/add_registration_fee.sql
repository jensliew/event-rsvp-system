-- Migration: Add registration_fee and stripe_price_id to events table
-- NULL or 0 = free event, any positive value = paid event (amount in MYR)
ALTER TABLE events
ADD COLUMN registration_fee DECIMAL(10, 2) DEFAULT NULL;

-- stripe_price_id: pre-created Price ID from Stripe Dashboard (e.g. price_xxxxx)
-- Required for paid events to use frontend Stripe Checkout
ALTER TABLE events
ADD COLUMN stripe_price_id VARCHAR(255) DEFAULT NULL;

-- Example: set fee and price ID on a specific event
-- UPDATE events SET registration_fee = 25.00, stripe_price_id = 'price_xxxxx' WHERE event_id = 'your-event-id';

-- Example: revert
-- ALTER TABLE events DROP COLUMN registration_fee;
-- ALTER TABLE events DROP COLUMN stripe_price_id;
