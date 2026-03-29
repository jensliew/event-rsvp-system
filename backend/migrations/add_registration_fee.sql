-- Migration: Add registration_fee to events table
-- NULL or 0 = free event, any positive value = paid event (amount in MYR)
ALTER TABLE events
ADD COLUMN registration_fee DECIMAL(10, 2) DEFAULT NULL;

-- Example: set a fee on a specific event
-- UPDATE events SET registration_fee = 25.00 WHERE event_id = 'your-event-id';

-- Example: revert (remove the column)
-- ALTER TABLE events DROP COLUMN registration_fee;
