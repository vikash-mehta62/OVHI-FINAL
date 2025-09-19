-- Enhanced Bills to Invoices System Schema
-- This schema provides a complete workflow from draft bills to finalized invoices with payment tracking

-- Bills table - Draft bills before they become invoices
CREATE TABLE IF NOT EXISTS bills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    status ENUM('draft', 'finalized', 'cancelled') DEFAULT 'draft',
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    notes TEXT,
    created_by INT, -- User who created the bill
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bills_patient_id (patient_id),
    INDEX idx_bills_status (status),
    INDEX idx_bills_created_at (created_at)
);

-- Bill items table - Services in draft bills
CREATE TABLE IF NOT EXISTS bill_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bill_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    INDEX idx_bill_items_bill_id (bill_id)
);

-- Invoices table - Finalized bills ready for payment
CREATE TABLE IF NOT EXISTS invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    bill_id INT NOT NULL,
    patient_id INT NOT NULL,
    status ENUM('pending', 'partially_paid', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    balance_due DECIMAL(10, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    issued_date DATE NOT NULL DEFAULT (CURDATE()),
    due_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    INDEX idx_invoices_number (invoice_number),
    INDEX idx_invoices_patient_id (patient_id),
    INDEX idx_invoices_status (status),
    INDEX idx_invoices_due_date (due_date),
    INDEX idx_invoices_created_at (created_at)
);

-- Invoice items table - Line items copied from bill items (immutable once created)
CREATE TABLE IF NOT EXISTS invoice_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    service_id INT NOT NULL,
    service_name VARCHAR(255) NOT NULL, -- Snapshot of service name at time of invoice
    service_code VARCHAR(50), -- CPT codes snapshot
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_items_invoice_id (invoice_id)
);

-- Payments table - Payment records against invoices
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'card', 'check', 'bank_transfer', 'insurance', 'online') NOT NULL,
    transaction_id VARCHAR(255),
    reference_number VARCHAR(100),
    payment_gateway ENUM('stripe', 'square', 'paypal', 'authorize_net', 'manual') DEFAULT 'manual',
    gateway_transaction_id VARCHAR(255),
    notes TEXT,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT, -- User who recorded the payment
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_payments_invoice_id (invoice_id),
    INDEX idx_payments_paid_at (paid_at),
    INDEX idx_payments_method (payment_method)
);

-- Invoice sequence table for generating invoice numbers
CREATE TABLE IF NOT EXISTS invoice_sequences (
    year INT PRIMARY KEY,
    last_sequence INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Triggers to automatically update invoice status based on payments
DELIMITER //

CREATE TRIGGER IF NOT EXISTS update_invoice_status_after_payment
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    DECLARE total_paid DECIMAL(10, 2);
    DECLARE invoice_total DECIMAL(10, 2);
    DECLARE new_status VARCHAR(20);
    
    -- Get current totals
    SELECT 
        COALESCE(SUM(amount_paid), 0),
        (SELECT total_amount FROM invoices WHERE id = NEW.invoice_id)
    INTO total_paid, invoice_total
    FROM payments 
    WHERE invoice_id = NEW.invoice_id;
    
    -- Determine new status
    IF total_paid >= invoice_total THEN
        SET new_status = 'paid';
    ELSEIF total_paid > 0 THEN
        SET new_status = 'partially_paid';
    ELSE
        SET new_status = 'pending';
    END IF;
    
    -- Update invoice
    UPDATE invoices 
    SET 
        amount_paid = total_paid,
        status = new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END//

CREATE TRIGGER IF NOT EXISTS update_invoice_status_after_payment_update
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
    DECLARE total_paid DECIMAL(10, 2);
    DECLARE invoice_total DECIMAL(10, 2);
    DECLARE new_status VARCHAR(20);
    
    -- Get current totals
    SELECT 
        COALESCE(SUM(amount_paid), 0),
        (SELECT total_amount FROM invoices WHERE id = NEW.invoice_id)
    INTO total_paid, invoice_total
    FROM payments 
    WHERE invoice_id = NEW.invoice_id;
    
    -- Determine new status
    IF total_paid >= invoice_total THEN
        SET new_status = 'paid';
    ELSEIF total_paid > 0 THEN
        SET new_status = 'partially_paid';
    ELSE
        SET new_status = 'pending';
    END IF;
    
    -- Update invoice
    UPDATE invoices 
    SET 
        amount_paid = total_paid,
        status = new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END//

CREATE TRIGGER IF NOT EXISTS update_invoice_status_after_payment_delete
AFTER DELETE ON payments
FOR EACH ROW
BEGIN
    DECLARE total_paid DECIMAL(10, 2);
    DECLARE invoice_total DECIMAL(10, 2);
    DECLARE new_status VARCHAR(20);
    
    -- Get current totals
    SELECT 
        COALESCE(SUM(amount_paid), 0),
        (SELECT total_amount FROM invoices WHERE id = OLD.invoice_id)
    INTO total_paid, invoice_total
    FROM payments 
    WHERE invoice_id = OLD.invoice_id;
    
    -- Determine new status
    IF total_paid >= invoice_total THEN
        SET new_status = 'paid';
    ELSEIF total_paid > 0 THEN
        SET new_status = 'partially_paid';
    ELSE
        SET new_status = 'pending';
    END IF;
    
    -- Update invoice
    UPDATE invoices 
    SET 
        amount_paid = total_paid,
        status = new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.invoice_id;
END//

DELIMITER ;

-- Views for common queries
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.patient_id,
    i.status,
    i.total_amount,
    i.amount_paid,
    i.balance_due,
    i.issued_date,
    i.due_date,
    i.created_at,
    CASE 
        WHEN i.due_date < CURDATE() AND i.status != 'paid' THEN 'overdue'
        ELSE i.status
    END as current_status,
    DATEDIFF(CURDATE(), i.due_date) as days_overdue,
    COUNT(p.id) as payment_count,
    MAX(p.paid_at) as last_payment_date
FROM invoices i
LEFT JOIN payments p ON i.id = p.invoice_id
GROUP BY i.id;

CREATE OR REPLACE VIEW aging_report AS
SELECT 
    patient_id,
    COUNT(*) as invoice_count,
    SUM(balance_due) as total_outstanding,
    SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) <= 30 THEN balance_due ELSE 0 END) as current_30,
    SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60 THEN balance_due ELSE 0 END) as days_31_60,
    SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 61 AND 90 THEN balance_due ELSE 0 END) as days_61_90,
    SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 90 THEN balance_due ELSE 0 END) as days_over_90
FROM invoices 
WHERE status != 'paid' AND status != 'cancelled'
GROUP BY patient_id;