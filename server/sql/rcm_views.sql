-- =====================================================
-- RCM System Views
-- =====================================================

-- Secondary Claim Opportunities View
CREATE OR REPLACE VIEW rcm_secondary_opportunities AS
SELECT 
    cb.id as primary_claim_id,
    cb.claim_number,
    cb.patient_id,
    CONCAT(up.firstname, ' ', up.lastname) as patient_name,
    cb.total_charge_amount,
    COALESCE(cb.total_paid_amount, 0) as primary_paid,
    cb.total_charge_amount - COALESCE(cb.total_paid_amount, 0) as remaining_balance,
    cb.date_of_service,
    cb.claim_status,
    COUNT(DISTINCT pi.id) as secondary_insurance_count,
    GROUP_CONCAT(DISTINCT p.payer_name ORDER BY pi.coverage_priority) as secondary_payers,
    MAX(pi.coverage_priority) as highest_secondary_priority
FROM rcm_claims cb
JOIN user_profiles up ON cb.patient_id = up.fk_userid
LEFT JOIN rcm_patient_insurance pi ON cb.patient_id = pi.patient_id 
    AND pi.coverage_type IN ('secondary', 'tertiary') 
    AND pi.is_active = TRUE
    AND (
        pi.effective_date <= COALESCE(cb.date_of_service, CURDATE())
        AND (pi.termination_date IS NULL OR pi.termination_date >= COALESCE(cb.date_of_service, CURDATE()))
    )
LEFT JOIN rcm_payers p ON pi.payer_id = p.id
LEFT JOIN rcm_claims sc ON cb.id = sc.claim_number AND sc.claim_type = 'secondary'
WHERE cb.claim_status = 'paid'  -- Paid by primary
AND cb.total_charge_amount > COALESCE(cb.total_paid_amount, 0)
AND pi.id IS NOT NULL
AND sc.id IS NULL  -- No secondary claim created yet
GROUP BY 
    cb.id, cb.claim_number, cb.patient_id, up.firstname, up.lastname, 
    cb.total_charge_amount, cb.total_paid_amount, cb.date_of_service, cb.claim_status
HAVING secondary_insurance_count > 0;

-- Add comments for documentation
COMMENT ON VIEW rcm_eligibility_summary IS 'Shows recent eligibility check results with risk assessment';
COMMENT ON VIEW rcm_secondary_opportunities IS 'Identifies primary claims that may have secondary billing opportunities';

-- Create indexes to optimize view performance
CREATE INDEX IF NOT EXISTS idx_eligibility_patient_date ON rcm_eligibility_requests(patient_id, request_date);
CREATE INDEX IF NOT EXISTS idx_claims_patient_status ON rcm_claims(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_insurance_patient_active ON rcm_patient_insurance(patient_id, is_active, coverage_type);
