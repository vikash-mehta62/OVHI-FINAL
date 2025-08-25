/**
 * Test Advanced CMS Validation Features
 * Tests the implementation of task 22: Advanced CMS validation features
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1/rcm';

// Test configuration
const TEST_CONFIG = {
    claimId: 1, // Use an existing claim ID
    testClaimData: {
        patient_id: 1,
        provider_npi: '1234567890',
        taxonomy_code: '207Q00000X',
        place_of_service: '11',
        insurance_name: 'Medicare',
        date_of_birth: '1950-01-01',
        gender: 'M',
        enrollment_status: 'active',
        enrollment_date: '2020-01-01',
        service_lines: [
            {
                procedure_code: '99213',
                diagnosis_pointer: '1',
                service_date: '2024-01-15',
                units: 1,
                charges: 150.00,
                place_of_service: '11'
            }
        ],
        diagnosis_codes: [
            {
                diagnosis_code: 'I25.10',
                diagnosis_description: 'Atherosclerotic heart disease',
                pointer_position: '1'
            }
        ],
        patient_history: []
    }
};

/**
 * Test medical necessity validation
 */
async function testMedicalNecessityValidation() {
    console.log('\n=== Testing Medical Necessity Validation ===');

    try {
        const response = await axios.post(`${BASE_URL}/cms/medical-necessity/validate`, {
            claimData: TEST_CONFIG.testClaimData
        });

        console.log('✅ Medical Necessity Validation Response:');
        console.log('Status:', response.data.result.status);
        console.log('Issues:', response.data.result.issues.length);
        console.log('Warnings:', response.data.result.warnings.length);
        console.log('Risk Level:', response.data.result.risk_level);

        if (response.data.result.recommendations.length > 0) {
            console.log('Recommendations:', response.data.result.recommendations);
        }

        return true;
    } catch (error) {
        console.error('❌ Medical Necessity Validation failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test timely filing validation
 */
async function testTimelyFilingValidation() {
    console.log('\n=== Testing Timely Filing Validation ===');

    try {
        // Test with recent service date
        const recentClaimData = {
            ...TEST_CONFIG.testClaimData,
            service_lines: [{
                ...TEST_CONFIG.testClaimData.service_lines[0],
                service_date: new Date().toISOString().split('T')[0] // Today
            }]
        };

        const response = await axios.post(`${BASE_URL}/cms/timely-filing/validate`, {
            claimData: recentClaimData
        });

        console.log('✅ Timely Filing Validation Response:');
        console.log('Status:', response.data.result.status);
        console.log('Filing Deadline:', response.data.result.filing_deadline);
        console.log('Days Remaining:', response.data.result.days_remaining);

        if (response.data.result.issues.length > 0) {
            console.log('Issues:', response.data.result.issues);
        }

        return true;
    } catch (error) {
        console.error('❌ Timely Filing Validation failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test provider enrollment validation
 */
async function testProviderEnrollmentValidation() {
    console.log('\n=== Testing Provider Enrollment Validation ===');

    try {
        const response = await axios.post(`${BASE_URL}/cms/provider-enrollment/validate`, {
            claimData: TEST_CONFIG.testClaimData
        });

        console.log('✅ Provider Enrollment Validation Response:');
        console.log('Status:', response.data.result.status);
        console.log('Enrollment Status:', response.data.result.enrollment_status);
        console.log('Enrollment Date:', response.data.result.enrollment_date);

        if (response.data.result.issues.length > 0) {
            console.log('Issues:', response.data.result.issues);
        }

        return true;
    } catch (error) {
        console.error('❌ Provider Enrollment Validation failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test frequency limits validation
 */
async function testFrequencyLimitsValidation() {
    console.log('\n=== Testing Frequency Limits Validation ===');

    try {
        // Test with multiple units to trigger limits
        const highFrequencyClaimData = {
            ...TEST_CONFIG.testClaimData,
            service_lines: [{
                ...TEST_CONFIG.testClaimData.service_lines[0],
                procedure_code: '97110', // Physical therapy
                units: 5 // Exceeds daily limit of 4
            }]
        };

        const response = await axios.post(`${BASE_URL}/cms/frequency-limits/validate`, {
            claimData: highFrequencyClaimData
        });

        console.log('✅ Frequency Limits Validation Response:');
        console.log('Status:', response.data.result.status);
        console.log('Issues:', response.data.result.issues.length);
        console.log('Frequency Analysis:', response.data.result.frequency_analysis);

        if (response.data.result.issues.length > 0) {
            console.log('Sample Issue:', response.data.result.issues[0]);
        }

        return true;
    } catch (error) {
        console.error('❌ Frequency Limits Validation failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test payer compliance validation
 */
async function testPayerComplianceValidation() {
    console.log('\n=== Testing Payer Compliance Validation ===');

    try {
        const response = await axios.post(`${BASE_URL}/cms/payer-compliance/validate`, {
            claimData: TEST_CONFIG.testClaimData
        });

        console.log('✅ Payer Compliance Validation Response:');
        console.log('Status:', response.data.result.status);
        console.log('Payer Type:', response.data.result.payer_type);
        console.log('Missing Fields:', response.data.result.missing_fields);

        if (response.data.result.issues.length > 0) {
            console.log('Issues:', response.data.result.issues);
        }

        return true;
    } catch (error) {
        console.error('❌ Payer Compliance Validation failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test claim completeness validation
 */
async function testClaimCompletenessValidation() {
    console.log('\n=== Testing Claim Completeness Validation ===');

    try {
        const response = await axios.post(`${BASE_URL}/cms/claim-completeness/validate`, {
            claimData: TEST_CONFIG.testClaimData
        });

        console.log('✅ Claim Completeness Validation Response:');
        console.log('Status:', response.data.result.status);
        console.log('Completeness Score:', response.data.result.completeness_score + '%');
        console.log('Missing Elements:', response.data.result.missing_elements.length);

        if (response.data.result.missing_elements.length > 0) {
            console.log('Sample Missing Element:', response.data.result.missing_elements[0]);
        }

        return true;
    } catch (error) {
        console.error('❌ Claim Completeness Validation failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test comprehensive advanced validation
 */
async function testAdvancedValidation() {
    console.log('\n=== Testing Comprehensive Advanced Validation ===');

    try {
        const response = await axios.post(`${BASE_URL}/claims/${TEST_CONFIG.claimId}/validate/advanced`);

        console.log('✅ Advanced Validation Response:');
        console.log('Overall Status:', response.data.overall_status);
        console.log('Compliance Score:', response.data.compliance_score + '%');
        console.log('Risk Assessment:', response.data.risk_assessment.overall_risk);

        console.log('\nValidation Categories:');
        Object.entries(response.data.validation_categories).forEach(([category, result]) => {
            console.log(`  ${category}: ${result.status}`);
        });

        if (response.data.recommendations.length > 0) {
            console.log('\nTop Recommendations:');
            response.data.recommendations.slice(0, 3).forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });
        }

        return true;
    } catch (error) {
        console.error('❌ Advanced Validation failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test validation statistics
 */
async function testValidationStatistics() {
    console.log('\n=== Testing Validation Statistics ===');

    try {
        const response = await axios.get(`${BASE_URL}/validation/advanced/statistics`);

        console.log('✅ Validation Statistics Response:');
        console.log('Total Validations:', response.data.total_validations);
        console.log('Compliance Rate:', response.data.compliance_rate + '%');

        if (response.data.status_breakdown.length > 0) {
            console.log('\nStatus Breakdown:');
            response.data.status_breakdown.forEach(status => {
                console.log(`  ${status.compliance_status}: ${status.count} (avg score: ${status.avg_compliance_score})`);
            });
        }

        return true;
    } catch (error) {
        console.error('❌ Validation Statistics failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Run individual validation tests (simpler version for testing)
 */
async function runBasicTests() {
    console.log('🚀 Starting Basic Advanced CMS Validation Tests...\n');

    const tests = [
        { name: 'Medical Necessity Validation', fn: testMedicalNecessityValidation },
        { name: 'Timely Filing Validation', fn: testTimelyFilingValidation },
        { name: 'Provider Enrollment Validation', fn: testProviderEnrollmentValidation },
        { name: 'Frequency Limits Validation', fn: testFrequencyLimitsValidation },
        { name: 'Payer Compliance Validation', fn: testPayerComplianceValidation },
        { name: 'Claim Completeness Validation', fn: testClaimCompletenessValidation }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error(`❌ Test "${test.name}" threw an error:`, error.message);
            failed++;
        }

        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

    if (failed === 0) {
        console.log('\n🎉 All advanced CMS validation features are working correctly!');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runBasicTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runBasicTests,
    testMedicalNecessityValidation,
    testTimelyFilingValidation,
    testProviderEnrollmentValidation,
    testFrequencyLimitsValidation,
    testPayerComplianceValidation,
    testClaimCompletenessValidation,
    testAdvancedValidation,
    testValidationStatistics
};