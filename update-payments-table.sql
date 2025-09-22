-- Update payments table to support both bill_id and invoice_id
-- This allows payments to be made against bills before they become invoices

-- Add bill_id column if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS bill_id INT NULL AFTER invoice_id;

-- Make invoice_id nullable to support bill payments
ALTER TABLE payments 
MODIFY COLUMN invoice_id INT NULL;

-- Add foreign key constraint for bill_id
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_bill_id 
FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;

-- Add index for bill_id
ALTER TABLE payments 
ADD INDEX IF NOT EXISTS idx_payments_bill_id (bill_id);

-- Add constraint to ensure either bill_id or invoice_id is set (but not both)
ALTER TABLE payments 
ADD CONSTRAINT chk_payment_reference 
CHECK (
    (bill_id IS NOT NULL AND invoice_id IS NULL) OR 
    (bill_id IS NULL AND invoice_id IS NOT NULL)
);

-- Add status column if it doesn't exist (for payment status tracking)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS status ENUM('completed', 'pending', 'failed') DEFAULT 'completed' AFTER notes;

-- Add payment_date column if it doesn't exist (separate from paid_at for flexibility)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT (CURDATE()) AFTER paid_at;

-- Add amount column alias for consistency (some parts of code use 'amount' instead of 'amount_paid')
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2) GENERATED ALWAYS AS (amount_paid) STORED AFTER amount_paid;