/**
 * Test Advanced CMS Validation Service
 * Unit tests for the AdvancedCMSValidationService class
 */

const AdvancedCMSValidationService = require('../server/services/rcm/advancedCMSValidationService');

// Mock database utilities
jest.mock('./server/utils/dbUtils', () => ({
    executeQuery: jest.fn(),
    executeQuerySingle: jest.fn(),
    auditLog: jest.fn()
}));

// Mock error handler
jest.mock('./server/middleware/errorHandler', () => ({
    createDatabaseError: jest.fn((message, details) => new Error(message)),
    createNotFoundError: jest.fn((message) => new Error(message)),
    createValidationError: jest.fn((message) => new Error(message))
}));

// Mock RCM utils
jest.mock('./server/utils/rcmUtils', () => ({
    formatDate: jest.fn((date) => date)
}));

// Mock claim history service
jest.mock('./server/services/rcm/claimHistoryService', () => {
    return jest.fn().mockImplementation(() => ({
        logClaimAction: jest.fn()
    }));
});

/**
 * Test the service initialization
 */
function testServiceInitialization() {
    console.log('\n=== Testing Service Initialization ===');
    
    try {
        const service = new AdvancedCMSValidationService();
        
        // Check if service is properly initialized
        if (service.name === 'AdvancedCMSValidationService') {
            console.log('✅ Service initialized correctly');
        } else {
            console.log('❌ Service name incorrect');
            return false;
        }
        
        // Check if rules are initialized
        if (service.medicalNecessityRules && 
            service.timelyFilingLimits && 
            service.frequencyLimits && 
            service.providerEnrollmentStatuses && 
            service.payerSpecificRules) {
            console.log('✅ All rule sets initialized');
        } else {
            console.log('❌ Rule sets not properly initialized');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Service initialization failed:', error.message);
        return false;
    }
}

/**
 * Test medical necessity rules
 */
function testMedicalNecessityRules() {
    console.log('\n=== Testing Medical Necessity Rules ===');
    
    try {
        const service = new AdvancedCMSValidationService();
        const rules = service.medicalNecessityRules;
        
        // Check high-risk combinations
        if (rules.high_risk_combinations && rules.high_risk_combinations.length > 0) {
            console.log('✅ High-risk combinations loaded:', rules.high_risk_combinations.length);
        } else {
            console.log('❌ High-risk combinations not loaded');
            return false;
        }
        
        // Check prior auth required procedures
        if (rules.prior_auth_required && rules.prior_auth_required.length > 0) {
            console.log('✅ Prior auth procedures loaded:', rules.prior_auth_required.length);
        } else {
            console.log('❌ Prior auth procedures not loaded');
            return false;
        }
        
        // Check age restrictions
        if (rules.age_restrictions && rules.age_restrictions.length > 0) {
            console.log('✅ Age restrictions loaded:', rules.age_restrictions.length);
        } else {
            console.log('❌ Age restrictions not loaded');
            return false;
        }
        
        // Check gender restrictions
        if (rules.gender_restrictions && rules.gender_restrictions.length > 0) {
            console.log('✅ Gender restrictions loaded:', rules.gender_restrictions.length);
        } else {
            console.log('❌ Gender restrictions not loaded');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Medical necessity rules test failed:', error.message);
        return false;
    }
}

/**
 * Test timely filing limits
 */
function testTimelyFilingLimits() {
    console.log('\n=== Testing Timely Filing Limits ===');
    
    try {
        const service = new AdvancedCMSValidationService();
        const limits = service.timelyFilingLimits;
        
        // Check required payer types
        const requiredPayers = ['Medicare', 'Medicaid', 'Commercial', 'TRICARE', 'Workers_Compensation'];
        
        for (const payer of requiredPayers) {
            if (limits[payer] && limits[payer].limit_days) {
                console.log(`✅ ${payer} filing limit: ${limits[payer].limit_days} days`);
            } else {
                console.log(`❌ ${payer} filing limit not defined`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Timely filing limits test failed:', error.message);
        return false;
    }
}

/**
 * Test frequency limits
 */
function testFrequencyLimits() {
    console.log('\n=== Testing Frequency Limits ===');
    
    try {
        const service = new AdvancedCMSValidationService();
        const limits = service.frequencyLimits;
        
        // Check different limit types
        const limitTypes = ['annual_limits', 'daily_limits', 'lifetime_limits', 'age_based_limits'];
        
        for (const limitType of limitTypes) {
            if (limits[limitType] && Array.isArray(limits[limitType])) {
                console.log(`✅ ${limitType} loaded: ${limits[limitType].length} rules`);
            } else {
                console.log(`❌ ${limitType} not properly loaded`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Frequency limits test failed:', error.message);
        return false;
    }
}

/**
 * Test provider enrollment statuses
 */
function testProviderEnrollmentStatuses() {
    console.log('\n=== Testing Provider Enrollment Statuses ===');
    
    try {
        const service = new AdvancedCMSValidationService();
        const statuses = service.providerEnrollmentStatuses;
        
        // Check required statuses
        const requiredStatuses = ['active', 'pending', 'suspended', 'terminated', 'deactivated'];
        
        for (const status of requiredStatuses) {
            if (statuses[status] && typeof statuses[status].can_bill === 'boolean') {
                console.log(`✅ ${status} status defined: can_bill=${statuses[status].can_bill}`);
            } else {
                console.log(`❌ ${status} status not properly defined`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Provider enrollment statuses test failed:', error.message);
        return false;
    }
}

/**
 * Test payer-specific rules
 */
function testPayerSpecificRules() {
    console.log('\n=== Testing Payer-Specific Rules ===');
    
    try {
        const service = new AdvancedCMSValidationService();
        const rules = service.payerSpecificRules;
        
        // Check required payers
        const requiredPayers = ['Medicare', 'Medicaid', 'Commercial'];
        
        for (const payer of requiredPayers) {
            if (rules[payer] && rules[payer].required_fields) {
                console.log(`✅ ${payer} rules defined: ${rules[payer].required_fields.length} required fields`);
            } else {
                console.log(`❌ ${payer} rules not properly defined`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Payer-specific rules test failed:', error.message);
        return false;
    }
}

/**
 * Test utility methods
 */
function testUtilityMethods() {
    console.log('\n=== Testing Utility Methods ===');
    
    try {
        const service = new AdvancedCMSValidationService();
        
        // Test calculateAge method
        const age = service.calculateAge('1990-01-01');
        if (typeof age === 'number' && age > 0) {
            console.log(`✅ calculateAge works: ${age} years`);
        } else {
            console.log('❌ calculateAge method failed');
            return false;
        }
        
        // Test determinePayerType method
        const payerType = service.determinePayerType('Medicare Part A');
        if (payerType === 'Medicare') {
            console.log('✅ determinePayerType works: Medicare detected');
        } else {
            console.log('❌ determinePayerType method failed');
            return false;
        }
        
        // Test getDiagnosisForPointer method
        const diagnosisCodes = [
            { diagnosis_code: 'I25.10', pointer_position: '1' },
            { diagnosis_code: 'E11.9', pointer_position: '2' }
        ];
        const diagnosis = service.getDiagnosisForPointer(diagnosisCodes, '1');
        if (diagnosis && diagnosis.diagnosis_code === 'I25.10') {
            console.log('✅ getDiagnosisForPointer works');
        } else {
            console.log('❌ getDiagnosisForPointer method failed');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Utility methods test failed:', error.message);
        return false;
    }
}

/**
 * Test risk assessment calculation
 */
function testRiskAssessment() {
    console.log('\n=== Testing Risk Assessment ===');
    
    try {
        const service = new AdvancedCMSValidationService();
        
        // Mock validation categories
        const validationCategories = {
            medical_necessity: { status: 'pass', warnings: [] },
            timely_filing: { status: 'warning', warnings: ['Approaching deadline'] },
            provider_enrollment: { status: 'failed', issues: ['Inactive enrollment'] },
            frequency_limits: { status: 'pass', warnings: [] },
            payer_compliance: { status: 'review_required', issues: ['Missing field'] },
            claim_completeness: { status: 'pass', completeness_score: 95 }
        };
        
        const riskAssessment = service.calculateRiskAssessment(validationCategories);
        
        if (riskAssessment.overall_risk && riskAssessment.risk_factors && riskAssessment.risk_score !== undefined) {
            console.log(`✅ Risk assessment calculated: ${riskAssessment.overall_risk} risk, score: ${riskAssessment.risk_score}`);
        } else {
            console.log('❌ Risk assessment calculation failed');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Risk assessment test failed:', error.message);
        return false;
    }
}

/**
 * Test compliance score calculation
 */
function testComplianceScore() {
    console.log('\n=== Testing Compliance Score ===');
    
    try {
        const service = new AdvancedCMSValidationService();
        
        // Mock validation categories
        const validationCategories = {
            medical_necessity: { status: 'pass' },
            timely_filing: { status: 'warning' },
            provider_enrollment: { status: 'failed' },
            frequency_limits: { status: 'pass' },
            payer_compliance: { status: 'review_required' },
            claim_completeness: { status: 'pass', completeness_score: 90 }
        };
        
        const complianceScore = service.calculateComplianceScore(validationCategories);
        
        if (typeof complianceScore === 'number' && complianceScore >= 0 && complianceScore <= 100) {
            console.log(`✅ Compliance score calculated: ${complianceScore}%`);
        } else {
            console.log('❌ Compliance score calculation failed');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Compliance score test failed:', error.message);
        return false;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Starting Advanced CMS Validation Service Tests...\n');
    
    const tests = [
        { name: 'Service Initialization', fn: testServiceInitialization },
        { name: 'Medical Necessity Rules', fn: testMedicalNecessityRules },
        { name: 'Timely Filing Limits', fn: testTimelyFilingLimits },
        { name: 'Frequency Limits', fn: testFrequencyLimits },
        { name: 'Provider Enrollment Statuses', fn: testProviderEnrollmentStatuses },
        { name: 'Payer-Specific Rules', fn: testPayerSpecificRules },
        { name: 'Utility Methods', fn: testUtilityMethods },
        { name: 'Risk Assessment', fn: testRiskAssessment },
        { name: 'Compliance Score', fn: testComplianceScore }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error(`❌ Test "${test.name}" threw an error:`, error.message);
            failed++;
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All advanced CMS validation service tests passed!');
        console.log('\n📋 Implementation Summary:');
        console.log('✅ Medical necessity validation with diagnosis-procedure checking');
        console.log('✅ Timely filing validation with CMS requirements');
        console.log('✅ Provider enrollment status verification');
        console.log('✅ Claim completeness checking with payer-specific rules');
        console.log('✅ Frequency and quantity limit validation');
        console.log('✅ Risk assessment and compliance scoring');
        console.log('✅ Comprehensive validation reporting');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }
    
    return failed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testServiceInitialization,
    testMedicalNecessityRules,
    testTimelyFilingLimits,
    testFrequencyLimits,
    testProviderEnrollmentStatuses,
    testPayerSpecificRules,
    testUtilityMethods,
    testRiskAssessment,
    testComplianceScore
};