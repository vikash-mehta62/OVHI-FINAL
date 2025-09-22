-- Add amount_paid column to bills table
ALTER TABLE bills ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0.00 AFTER total_amount;

-- Update existing bills with current payment totals
UPDATE bills b 
SET amount_paid = (
    SELECT COALESCE(SUM(p.amount), 0) 
    FROM payments p 
    WHERE p.bill_id = b.id AND p.status = 'completed'
);

-- Add index for performance
ALTER TABLE bills ADD INDEX idx_amount_paid (amount_paid);