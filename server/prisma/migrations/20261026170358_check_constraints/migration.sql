-- Add check constraint for positive donation quantity
ALTER TABLE "Donation" ADD CONSTRAINT "chk_donation_quantity_positive" CHECK ("quantity" > 0);

-- Add check constraint for chronological timestamps
ALTER TABLE "Donation" ADD CONSTRAINT "chk_donation_timestamps" CHECK ("preparedAt" <= "consumeBy" AND "pickupDeadline" <= "consumeBy");