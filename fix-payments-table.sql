-- Fix payments table by adding missing columns if they don't exist

-- Add check_number column if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS check_number VARCHAR(50) AFTER payment_method;

-- Add reference_number column if it doesn't exist  
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100) AFTER check_number;

-- Add adjustment_amount column if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS adjustment_amount DECIMAL(10,2) DEFAULT 0.00 AFTER reference_number;

-- Add adjustment_reason column if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT AFTER adjustment_amount;

-- Add status column if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed' AFTER adjustment_reason;

-- Add posted_by column if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS posted_by INT AFTER status;

-- Show the updated table structure
DESCRIBE payments;