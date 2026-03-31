-- Migration: Add registration_fee and payment_link to events table
-- NULL or 0 = free event, any positive value = paid event (amount in MYR)
ALTER TABLE events
ADD COLUMN registration_fee DECIMAL(10, 2) DEFAULT NULL;

-- payment_link: Stripe Payment Link URL created from Stripe Dashboard
-- e.g. https://buy.stripe.com/test_xxxxx
ALTER TABLE events
ADD COLUMN payment_link VARCHAR(500) DEFAULT NULL;

-- Example: set fee and payment link on a specific event
-- UPDATE events SET registration_fee = 25.00, payment_link = 'https://buy.stripe.com/test_xxxxx' WHERE event_id = 'your-event-id';

-- Example: revert
-- ALTER TABLE events DROP COLUMN registration_fee;
-- ALTER TABLE events DROP COLUMN payment_link;
