-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT,
    patient_id INT,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Electronic',
    check_number VARCHAR(50),
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    adjustment_reason TEXT,
    reference_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed',
    posted_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_id (claim_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_payment_date (payment_date)
);

-- Check if table was created successfully
DESCRIBE payments;