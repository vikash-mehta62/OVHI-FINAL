-- Add sample claims data to billings table
INSERT IGNORE INTO billings (
  id, patient_id, provider_id, procedure_code, diagnosis_code, 
  total_amount, service_date, status, created, updated
) VALUES 
(191, 101, 1, '99213', 'Z00.00', 150.00, '2024-01-15', 1, NOW(), NOW()),
(192, 102, 1, '99214', 'I10', 200.00, '2024-01-16', 2, NOW(), NOW()),
(193, 103, 1, '99215', 'E11.9', 250.00, '2024-01-17', 1, NOW(), NOW()),
(194, 101, 1, '99212', 'Z00.01', 125.00, '2024-01-18', 3, NOW(), NOW()),
(195, 102, 1, '99213', 'M79.3', 175.00, '2024-01-19', 1, NOW(), NOW());

-- Add corresponding payments for some claims
INSERT IGNORE INTO payments (
  claim_id, patient_id, amount, payment_date, payment_method, 
  check_number, status, created_at
) VALUES 
(192, 102, 200.00, '2024-01-20', 'Electronic', 'EFT123456', 'completed', NOW()),
(194, 101, 125.00, '2024-01-21', 'Check', 'CHK789012', 'completed', NOW());

-- Verify the data
SELECT 'Claims Count' as Info, COUNT(*) as Count FROM billings
UNION ALL
SELECT 'Payments Count' as Info, COUNT(*) as Count FROM payments;