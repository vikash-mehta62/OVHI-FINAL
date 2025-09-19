
-- Bills table - Draft bills before they become invoices
CREATE TABLE IF NOT EXISTS bills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    status ENUM('draft', 'finalized') DEFAULT 'draft',
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    notes TEXT,
    created_by INT, -- User who created the bill
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Bill items table - Services in draft bills
CREATE TABLE IF NOT EXISTS bill_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bill_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- Payments table - Payment records against invoices
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'card', 'check', 'bank_transfer', 'insurance') NOT NULL,
    transaction_id VARCHAR(255),
    reference_number VARCHAR(100),
    notes TEXT,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);