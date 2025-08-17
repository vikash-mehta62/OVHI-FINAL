-- MIPS Sample Data for Testing and Development
-- This file contains sample data for the MIPS compliance system

-- Sample Quality Measures for 2024
INSERT IGNORE INTO mips_quality_measures (
  measure_id, measure_title, measure_type, collection_type, specialty_set, 
  high_priority, outcome_measure, appropriate_use_measure, performance_year,
  measure_description, numerator_description, denominator_description, 
  exclusions_description, minimum_case_requirement, cpt_codes, icd10_codes
) VALUES
-- Diabetes Care Measures
('001', 'Diabetes: Hemoglobin A1c (HbA1c) Poor Control (>9%)', 'outcome', 'ecqm', 'family_medicine,internal_medicine', TRUE, TRUE, FALSE, 2024,
 'Percentage of patients 18-75 years of age with diabetes who had hemoglobin A1c > 9.0% during the measurement period',
 'Patients with most recent HbA1c level >9.0% or no HbA1c test performed',
 'Patients 18-75 years with diabetes',
 'Patients with polycystic ovarian syndrome, gestational diabetes, or steroid-induced diabetes',
 20, '["99213", "99214", "99215", "99395", "99396", "99397"]', '["E11.9", "E10.9", "E13.9"]'),

('002', 'Diabetes: Eye Exam', 'process', 'ecqm', 'family_medicine,internal_medicine,ophthalmology', TRUE, FALSE, FALSE, 2024,
 'Percentage of patients 18-75 years of age with diabetes who had a retinal or dilated eye exam by an eye care professional',
 'Patients who had dilated eye exam by eye care professional during measurement period or prior year',
 'Patients 18-75 years with diabetes',
 'Patients with polycystic ovarian syndrome or gestational diabetes',
 20, '["92002", "92004", "92012", "92014", "92018", "92019"]', '["E11.9", "E10.9", "E13.9"]'),

-- Hypertension Measures
('236', 'Controlling High Blood Pressure', 'outcome', 'ecqm', 'family_medicine,internal_medicine,cardiology', TRUE, TRUE, FALSE, 2024,
 'Percentage of patients 18-85 years of age who had a diagnosis of hypertension and whose blood pressure was adequately controlled',
 'Patients with BP <140/90 mmHg at most recent visit',
 'Patients 18-85 years with hypertension diagnosis',
 'Patients with evidence of end-stage renal disease, kidney transplant, or pregnancy',
 20, '["99213", "99214", "99215", "99395", "99396", "99397"]', '["I10", "I11.0", "I11.9", "I12.0", "I12.9", "I13.0"]'),

-- Preventive Care Measures
('317', 'Preventive Care and Screening: Screening for High Blood Pressure and Follow-Up Documented', 'process', 'ecqm', 'family_medicine,internal_medicine', FALSE, FALSE, FALSE, 2024,
 'Percentage of patients aged 18 years and older seen during the measurement period who were screened for high blood pressure',
 'Patients with blood pressure measurement documented and appropriate follow-up documented',
 'All patients aged 18 years and older',
 'Patients with diagnosis of hypertension',
 20, '["99213", "99214", "99215", "99395", "99396", "99397"]', '[]'),

-- Medication Management
('128', 'Anti-depressant Medication Management', 'process', 'ecqm', 'family_medicine,internal_medicine,psychiatry', FALSE, FALSE, FALSE, 2024,
 'Percentage of patients 18 years of age and older who were treated with antidepressant medication, had a diagnosis of major depression',
 'Patients who remained on antidepressant medication treatment for at least 84 days (12 weeks)',
 'Patients 18+ with major depression and antidepressant medication',
 'Patients with bipolar disorder, personality disorders, or psychotic disorders',
 20, '["99213", "99214", "99215", "90834", "90837"]', '["F32.0", "F32.1", "F32.2", "F32.3", "F32.4", "F32.5", "F33.0"]'),

-- Cancer Screening
('112', 'Breast Cancer Screening', 'process', 'ecqm', 'family_medicine,internal_medicine,gynecology', TRUE, FALSE, FALSE, 2024,
 'Percentage of women 50-74 years of age who had a mammogram to screen for breast cancer',
 'Women who had one or more mammograms during the measurement period or the 15 months prior',
 'Women 50-74 years of age with a visit during the measurement period',
 'Women who had a bilateral mastectomy or who have a history of bilateral mastectomy',
 20, '["77067", "77063", "99213", "99214", "99215"]', '[]'),

-- Immunization
('110', 'Preventive Care and Screening: Influenza Immunization', 'process', 'ecqm', 'family_medicine,internal_medicine,pediatrics', FALSE, FALSE, FALSE, 2024,
 'Percentage of patients aged 6 months and older seen for a visit between July 1 and June 30 who received an influenza immunization',
 'Patients who received influenza vaccination during the flu season (July 1 - June 30)',
 'All patients aged 6 months and older with a visit during the measurement period',
 'Patients with anaphylactic reaction to vaccine or medical contraindication',
 20, '["90686", "90687", "90688", "99213", "99214", "99215"]', '[]');

-- Sample PI Measures for 2024
INSERT IGNORE INTO mips_pi_measures (
  measure_id, measure_title, measure_category, required_measure, performance_year,
  objective_description, numerator_description, denominator_description,
  threshold_percentage, max_points, bonus_points
) VALUES
-- Base Measures (Required)
('PI_EP_1', 'e-Prescribing', 'base', TRUE, 2024,
 'Generate and transmit permissible prescriptions electronically',
 'Number of prescriptions in the denominator generated and transmitted electronically',
 'Number of prescriptions written for drugs requiring a prescription in order to be dispensed other than controlled substances',
 75.0, 10, 0),

('PI_HIE_1', 'Health Information Exchange', 'base', TRUE, 2024,
 'The MIPS eligible clinician is in active engagement with a public health agency to submit data',
 'Number of laboratory tests and values that were sent electronically to public health agencies',
 'Number of laboratory tests and values that are reportable to one or more public health agencies',
 10.0, 10, 0),

-- Performance Measures
('PI_EP_2', 'Query of Prescription Drug Monitoring Program (PDMP)', 'performance', FALSE, 2024,
 'Query of PDMP for prescription drug history',
 'Number of patients for whom PDMP was queried by the MIPS eligible clinician',
 'Number of patients 18 years or older prescribed a Schedule II opioid or benzodiazepine',
 60.0, 5, 0),

('PI_PHCDRR_1', 'Public Health and Clinical Data Registry Reporting', 'performance', FALSE, 2024,
 'The MIPS eligible clinician is in active engagement with a public health agency',
 'Successful ongoing submission of data to a public health agency or clinical data registry',
 'MIPS eligible clinician is registered to submit data to a public health agency or clinical data registry',
 0.0, 5, 0),

-- Bonus Measures
('PI_INFBLO_1', 'Information Blocking Attestation', 'bonus', FALSE, 2024,
 'Attest to not knowingly and willfully taking action to limit or restrict the compatibility or interoperability of CEHRT',
 'Attestation completed',
 'All MIPS eligible clinicians using CEHRT',
 0.0, 0, 5),

('PI_OHIT_1', 'ONC Health IT Certification ID', 'bonus', FALSE, 2024,
 'Report the ONC Health IT Certification ID(s) for all of the certified health IT used',
 'ONC Health IT Certification ID reported',
 'All MIPS eligible clinicians using CEHRT',
 0.0, 0, 5);

-- Sample Improvement Activities for 2024
INSERT IGNORE INTO mips_improvement_activities (
  activity_id, activity_title, activity_description, subcategory, weight, performance_year,
  attestation_requirements, supporting_documentation
) VALUES
-- Expanded Practice Access
('IA_EPA_1', 'Collection and follow-up on patient experience and satisfaction data on beneficiary engagement', 
 'Collection and follow-up on patient experience and satisfaction data on beneficiary engagement, including development of improvement plan.',
 'expanded_practice_access', 'medium', 2024,
 'Regular collection of patient satisfaction data and documented improvement plans based on results',
 'Patient satisfaction surveys, improvement plans, follow-up documentation'),

('IA_EPA_2', 'Use of telehealth services that expand practice access',
 'Provide telehealth services that expand practice access for patients to receive care.',
 'expanded_practice_access', 'medium', 2024,
 'Documentation of telehealth services provided to expand patient access',
 'Telehealth visit logs, patient access improvement documentation'),

-- Population Management
('IA_PM_1', 'Participation in a QCDR, that promotes use of patient engagement tools',
 'Participation in a QCDR, that promotes use of patient engagement tools including shared clinical decision making.',
 'population_management', 'medium', 2024,
 'Active participation in QCDR with patient engagement focus',
 'QCDR participation documentation, patient engagement tool usage reports'),

('IA_PM_2', 'Implementation of methodologies for improvements in longitudinal care management',
 'Implementation of methodologies for improvements in longitudinal care management for high risk patients.',
 'population_management', 'high', 2024,
 'Documented care management protocols for high-risk patients implemented for 90+ days',
 'Care management protocols, high-risk patient identification, longitudinal care documentation'),

-- Care Coordination
('IA_CC_1', 'Implementation of additional improvements in care coordination',
 'Implementation of additional improvements in care coordination that are not represented by other improvement activities.',
 'care_coordination', 'medium', 2024,
 'Documentation of care coordination improvements beyond standard activities',
 'Care coordination protocols, referral tracking, care team communication documentation'),

('IA_CC_2', 'Implementation of practices/processes for developing regular individual care plans',
 'Implementation of practices/processes for developing regular individual care plans for patients at high risk for adverse health outcomes.',
 'care_coordination', 'high', 2024,
 'Individual care plans developed for high-risk patients with regular updates',
 'Individual care plans, risk stratification documentation, care plan updates'),

-- Beneficiary Engagement
('IA_BE_1', 'Collection and follow-up on patient experience and satisfaction data',
 'Collection and follow-up on patient experience and satisfaction data on beneficiary engagement.',
 'beneficiary_engagement', 'medium', 2024,
 'Regular patient satisfaction surveys with documented follow-up actions',
 'Patient satisfaction surveys, improvement action plans, follow-up documentation'),

('IA_BE_2', 'Use of patient-facing educational resources',
 'Provide patients with educational resources specific to the patient\'s condition, treatment, or diagnosis.',
 'beneficiary_engagement', 'medium', 2024,
 'Patient education materials provided and documented for 90+ days',
 'Educational materials, patient education logs, condition-specific resources'),

-- Patient Safety and Practice Assessment
('IA_PSPA_1', 'Participation in a QCDR, that promotes implementation of patient safety practices',
 'Participation in a QCDR, that promotes implementation of patient safety practices.',
 'patient_safety_practice_improvements', 'medium', 2024,
 'Active participation in QCDR focused on patient safety improvements',
 'QCDR participation documentation, patient safety practice implementation'),

('IA_PSPA_2', 'Implementation of formal quality improvement methods, practice changes, or other practice improvement processes',
 'Implementation of formal quality improvement methods, practice changes, or other practice improvement processes.',
 'patient_safety_practice_improvements', 'high', 2024,
 'Formal QI methodology implemented with documented practice changes',
 'QI methodology documentation, practice change implementation, outcome measurements'),

-- Achieving Health Equity
('IA_AHE_1', 'Completion of training or certification in appropriate provision of services to Medicare beneficiaries',
 'Completion of training or certification in appropriate provision of services to Medicare beneficiaries from underserved populations.',
 'achieving_health_equity', 'medium', 2024,
 'Completion of cultural competency or health equity training',
 'Training certificates, cultural competency documentation, underserved population service documentation'),

('IA_AHE_2', 'Implementation of patient-centered service delivery that addresses social determinants of health',
 'Implementation of patient-centered service delivery that addresses social determinants of health.',
 'achieving_health_equity', 'high', 2024,
 'Social determinants screening and intervention programs implemented',
 'SDOH screening tools, intervention programs, community resource partnerships');

-- Sample MIPS Configuration for 2024
INSERT IGNORE INTO mips_configuration (performance_year, config_key, config_value, config_description) VALUES
(2024, 'quality_category_weight', '0.45', 'Quality category weight in composite score'),
(2024, 'pi_category_weight', '0.25', 'Promoting Interoperability category weight'),
(2024, 'ia_category_weight', '0.15', 'Improvement Activities category weight'),
(2024, 'cost_category_weight', '0.15', 'Cost category weight in composite score'),
(2024, 'minimum_quality_measures', '6', 'Minimum number of quality measures required'),
(2024, 'outcome_measure_required', 'true', 'At least one outcome measure required'),
(2024, 'case_minimum_threshold', '20', 'Minimum cases required per quality measure'),
(2024, 'data_completeness_threshold', '70', 'Minimum data completeness percentage'),
(2024, 'submission_deadline', '"2025-03-31"', 'Final submission deadline'),
(2024, 'performance_period_start', '"2024-01-01"', 'Performance period start date'),
(2024, 'performance_period_end', '"2024-12-31"', 'Performance period end date'),
(2024, 'performance_threshold', '75', 'Performance threshold for positive payment adjustment'),
(2024, 'max_positive_adjustment', '9.0', 'Maximum positive payment adjustment percentage'),
(2024, 'max_negative_adjustment', '-9.0', 'Maximum negative payment adjustment percentage'),
(2024, 'small_practice_threshold', '15', 'Small practice threshold (number of clinicians)'),
(2024, 'rural_practice_bonus', '5', 'Bonus points for rural practices'),
(2024, 'hpsa_bonus', '5', 'Bonus points for Health Professional Shortage Area practices');

-- Sample specialty mappings
INSERT IGNORE INTO mips_configuration (performance_year, config_key, config_value, config_description) VALUES
(2024, 'specialty_mappings', '{
  "family_medicine": {"code": "08", "name": "Family Medicine", "measures": ["001", "002", "236", "317", "112", "110"]},
  "internal_medicine": {"code": "11", "name": "Internal Medicine", "measures": ["001", "002", "236", "317", "128", "112"]},
  "cardiology": {"code": "06", "name": "Cardiology", "measures": ["236", "317", "128"]},
  "dermatology": {"code": "07", "name": "Dermatology", "measures": ["317", "110"]},
  "emergency_medicine": {"code": "93", "name": "Emergency Medicine", "measures": ["317", "110"]},
  "orthopedic_surgery": {"code": "20", "name": "Orthopedic Surgery", "measures": ["317", "110"]},
  "pediatrics": {"code": "37", "name": "Pediatrics", "measures": ["110", "317"]},
  "psychiatry": {"code": "26", "name": "Psychiatry", "measures": ["128", "317"]},
  "gynecology": {"code": "16", "name": "Obstetrics/Gynecology", "measures": ["112", "317", "110"]},
  "ophthalmology": {"code": "18", "name": "Ophthalmology", "measures": ["002", "317"]}
}', 'Specialty-specific measure mappings and information');

-- Sample benchmark data for quality measures
UPDATE mips_quality_measures SET benchmark_data = '{
  "deciles": [10, 25, 40, 55, 70, 80, 85, 90, 95, 100],
  "mean": 75.5,
  "percentile_10": 45.2,
  "percentile_30": 62.8,
  "percentile_50": 75.5,
  "percentile_70": 88.1,
  "percentile_90": 95.7,
  "sample_size": 15420,
  "benchmark_year": 2023
}' WHERE measure_id = '001';

UPDATE mips_quality_measures SET benchmark_data = '{
  "deciles": [15, 30, 45, 60, 75, 85, 90, 95, 98, 100],
  "mean": 68.3,
  "percentile_10": 35.1,
  "percentile_30": 52.4,
  "percentile_50": 68.3,
  "percentile_70": 84.2,
  "percentile_90": 96.8,
  "sample_size": 12850,
  "benchmark_year": 2023
}' WHERE measure_id = '002';

UPDATE mips_quality_measures SET benchmark_data = '{
  "deciles": [20, 35, 50, 65, 75, 82, 88, 93, 97, 100],
  "mean": 71.2,
  "percentile_10": 42.6,
  "percentile_30": 58.9,
  "percentile_50": 71.2,
  "percentile_70": 83.5,
  "percentile_90": 95.1,
  "sample_size": 18750,
  "benchmark_year": 2023
}' WHERE measure_id = '236';

-- Sample cost measure data (typically populated by CMS)
INSERT IGNORE INTO mips_cost_performance (
  provider_id, performance_year, cost_measure_id, cost_measure_name,
  episode_count, total_cost, benchmark_cost, performance_score, percentile_rank, data_source
) VALUES
(1, 2024, 'MSPB_1', 'Medicare Spending Per Beneficiary', 150, 125000.00, 130000.00, 85.5, 75.2, 'cms_claims'),
(1, 2024, 'TPCC_1', 'Total Per Capita Cost', 200, 8500.00, 9200.00, 78.3, 68.9, 'cms_claims');

-- Create some sample audit log entries
INSERT IGNORE INTO mips_audit_log (
  provider_id, performance_year, action_type, action_description, 
  affected_measure_id, user_id, ip_address, user_agent
) VALUES
(1, 2024, 'calculation', 'Initial MIPS score calculation performed', NULL, 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 2024, 'validation', 'Quality measure data validation completed', '001', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 2024, 'attestation', 'PI measure attestation submitted', 'PI_EP_1', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mips_quality_measures_specialty_year ON mips_quality_measures(specialty_set, performance_year, is_active);
CREATE INDEX IF NOT EXISTS idx_mips_provider_measures_status ON mips_provider_measures(provider_id, performance_year, selection_status);
CREATE INDEX IF NOT EXISTS idx_mips_quality_performance_calculation ON mips_quality_performance(provider_measure_id, case_minimum_met, data_completeness);
CREATE INDEX IF NOT EXISTS idx_mips_pi_performance_status ON mips_pi_performance(provider_id, performance_year, attestation_status);
CREATE INDEX IF NOT EXISTS idx_mips_ia_attestations_status ON mips_ia_attestations(provider_id, performance_year, attestation_status);
CREATE INDEX IF NOT EXISTS idx_mips_submissions_year_status ON mips_submissions(performance_year, submission_status);
CREATE INDEX IF NOT EXISTS idx_mips_data_gaps_priority ON mips_data_gaps(provider_id, performance_year, impact_level, status);

-- Sample comments for documentation
ALTER TABLE mips_quality_measures COMMENT = 'CMS MIPS Quality Measures catalog with benchmarks and specifications';
ALTER TABLE mips_provider_measures COMMENT = 'Provider-specific quality measure selections and performance targets';
ALTER TABLE mips_quality_performance COMMENT = 'Calculated quality measure performance data and scores';
ALTER TABLE mips_pi_measures COMMENT = 'Promoting Interoperability measures and requirements';
ALTER TABLE mips_pi_performance COMMENT = 'PI measure attestations and performance tracking';
ALTER TABLE mips_improvement_activities COMMENT = 'MIPS Improvement Activities catalog';
ALTER TABLE mips_ia_attestations COMMENT = 'IA activity attestations and completion tracking';
ALTER TABLE mips_cost_performance COMMENT = 'Cost category performance data (typically from CMS claims)';
ALTER TABLE mips_submissions COMMENT = 'MIPS submission status and composite scoring';
ALTER TABLE mips_eligibility COMMENT = 'Provider MIPS eligibility determination and tracking';
ALTER TABLE mips_data_gaps COMMENT = 'Identified data gaps and remediation task management';
ALTER TABLE mips_audit_log COMMENT = 'Comprehensive audit trail for all MIPS activities';
ALTER TABLE mips_configuration COMMENT = 'MIPS system configuration and business rules by performance year';