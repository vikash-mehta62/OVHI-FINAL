-- RCM Database Optimization - Index Creation Script
-- This script creates optimized indexes for RCM queries to improve performance

-- =====================================================
-- BILLINGS TABLE INDEXES
-- =====================================================

-- Primary composite index for dashboard queries (status + date filtering)
CREATE INDEX idx_billings_status_created ON billings (status, created);

-- Composite index for service date calculations (A/R aging)
CREATE INDEX idx_billings_status_service_date ON billings (status, service_date);

-- Index for patient lookups in claims
CREATE INDEX idx_billings_patient_id_status ON billings (patient_id, status);

-- Index for date range queries
CREATE INDEX idx_billings_created_date ON billings (DATE(created));
CREATE INDEX idx_billings_service_date ON billings (DATE(service_date));

-- Index for amount-based queries
CREATE INDEX idx_billings_total_amount ON billings (total_amount);

-- Composite index for denial analytics
CREATE INDEX idx_billings_denial_reason_created ON billings (status, denial_reason, created) 
WHERE status = 3;

-- Index for procedure code searches
CREATE INDEX idx_billings_procedure_code ON billings (procedure_code);

-- Composite index for A/R aging calculations
CREATE INDEX idx_billings_ar_aging ON billings (status, service_date, total_amount) 
WHERE status IN (1, 3);

-- =====================================================
-- PATIENTS TABLE INDEXES
-- =====================================================

-- Index for patient name searches
CREATE INDEX idx_patients_name_search ON patients (first_name, last_name);

-- Full-text index for patient search (if MySQL supports it)
-- ALTER TABLE patients ADD FULLTEXT(first_name, last_name, email);

-- Index for patient contact information
CREATE INDEX idx_patients_email ON patients (email);
CREATE INDEX idx_patients_phone ON patients (phone);

-- =====================================================
-- PAYMENTS TABLE INDEXES (if exists)
-- =====================================================

-- Index for payment date queries
CREATE INDEX idx_payments_payment_date ON payments (payment_date);

-- Composite index for payment analytics
CREATE INDEX idx_payments_status_date_amount ON payments (status, payment_date, amount);

-- Index for patient payment history
CREATE INDEX idx_payments_patient_id_date ON payments (patient_id, payment_date);

-- =====================================================
-- AUDIT_LOG TABLE INDEXES (if exists)
-- =====================================================

-- Index for audit queries by table and record
CREATE INDEX idx_audit_log_table_record ON audit_log (table_name, record_id);

-- Index for audit queries by user and timestamp
CREATE INDEX idx_audit_log_user_timestamp ON audit_log (user_id, timestamp);

-- Index for audit queries by action type
CREATE INDEX idx_audit_log_action_timestamp ON audit_log (action, timestamp);

-- =====================================================
-- PAYERS TABLE INDEXES (if exists)
-- =====================================================

-- Index for payer name searches
CREATE INDEX idx_payers_name ON payers (payer_name);

-- =====================================================
-- PERFORMANCE MONITORING QUERIES
-- =====================================================

-- Query to check index usage
-- SELECT 
--   TABLE_NAME,
--   INDEX_NAME,
--   CARDINALITY,
--   SUB_PART,
--   PACKED,
--   NULLABLE,
--   INDEX_TYPE
-- FROM INFORMATION_SCHEMA.STATISTICS 
-- WHERE TABLE_SCHEMA = DATABASE() 
--   AND TABLE_NAME IN ('billings', 'patients', 'payments')
-- ORDER BY TABLE_NAME, INDEX_NAME;

-- Query to check slow queries
-- SELECT 
--   query_time,
--   lock_time,
--   rows_sent,
--   rows_examined,
--   sql_text
-- FROM mysql.slow_log 
-- WHERE sql_text LIKE '%billings%' 
-- ORDER BY query_time DESC 
-- LIMIT 10;

-- =====================================================
-- MAINTENANCE RECOMMENDATIONS
-- =====================================================

-- 1. Regularly analyze tables to update statistics
-- ANALYZE TABLE billings, patients, payments;

-- 2. Optimize tables to defragment and reclaim space
-- OPTIMIZE TABLE billings, patients, payments;

-- 3. Monitor index usage and remove unused indexes
-- Use pt-index-usage from Percona Toolkit

-- 4. Consider partitioning large tables by date
-- ALTER TABLE billings PARTITION BY RANGE (YEAR(created)) (
--   PARTITION p2023 VALUES LESS THAN (2024),
--   PARTITION p2024 VALUES LESS THAN (2025),
--   PARTITION p2025 VALUES LESS THAN (2026)
-- );

-- =====================================================
-- QUERY OPTIMIZATION NOTES
-- =====================================================

-- 1. Always use LIMIT for large result sets
-- 2. Avoid SELECT * in production queries
-- 3. Use appropriate WHERE clause ordering (most selective first)
-- 4. Consider using EXISTS instead of IN for subqueries
-- 5. Use UNION ALL instead of UNION when duplicates are acceptable
-- 6. Avoid functions in WHERE clauses (use functional indexes instead)
-- 7. Use covering indexes when possible to avoid table lookups