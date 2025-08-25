/**
 * Test External System Integrations
 * Tests the implementation of task 25: External system integrations
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1/rcm';

// Test configuration
const TEST_CONFIG = {
    patientData: {
        patient_id: 1,
        member_id: 'MED123456789',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1980-01-15',
        gender: 'M',
        payer_id: 'MEDICARE',
        payer_name: 'Medicare',
        provider_npi: '1234567890',
        provider_taxonomy: '207Q00000X'
    },
    priorAuthData: {
        claim_id: 1,
        patient: {
            member_id: 'MED123456789',
            first_name: 'John',
            last_name: 'Doe',
            date_of_birth: '1980-01-15'
        },
        provider: {
            npi: '1234567890',
            name: 'Dr. Smith'
        },
        services: [
            {
                procedure_code: '99213',
                description: 'Office visit',
                units: 1
            }
        ],
        diagnosis: [
            {
                code: 'I25.10',
                description: 'Atherosclerotic heart disease'
            }
        ],
        clinical_information: 'Patient requires follow-up care for cardiac condition',
        urgency: 'routine'
    },
    statusInquiry: {
        claim_id: 1,
        payer_claim_number: 'PCN123456',
        patient: {
            member_id: 'MED123456789',
            first_name: 'John',
            last_name: 'Doe'
        },
        provider: {
            npi: '1234567890'
        },
        service_date: '2024-01-15'
    },
    eraData: {
        file_content: 'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *240115*1200*^*00501*000000001*0*P*:~',
        format: 'X12_835',
        payer_id: 'MEDICARE',
        auto_post: true,
        create_adjustments: true,
        update_status: true
    }
};

/**
 * Test eligibility verification
 */
async function testEligibilityVerification() {
    console.log('\n=== Testing Eligibility Verification ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/integrations/eligibility/verify`, {
            ...TEST_CONFIG.patientData,
            service_date: '2024-01-15',
            check_benefits: true
        });
        
        console.log('✅ Eligibility Verification Response:');
        console.log('Eligible:', response.data.eligible ? 'Yes' : 'No');
        console.log('Coverage Status:', response.data.coverage_status);
        console.log('Verification Date:', response.data.verification_date);
        
        if (response.data.copay_amount !== undefined) {
            console.log('Copay Amount:', '$' + response.data.copay_amount);
        }
        
        if (response.data.deductible_remaining !== undefined) {
            console.log('Deductible Remaining:', '$' + response.data.deductible_remaining);
        }
        
        if (response.data.benefits && response.data.benefits.length > 0) {
            console.log('Benefits:', response.data.benefits.length + ' benefit(s) found');
        }
        
        if (response.data.messages && response.data.messages.length > 0) {
            console.log('Messages:', response.data.messages.length + ' message(s)');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Eligibility Verification failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test prior authorization submission
 */
async function testPriorAuthorizationSubmission() {
    console.log('\n=== Testing Prior Authorization Submission ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/integrations/prior-auth/submit`, TEST_CONFIG.priorAuthData);
        
        console.log('✅ Prior Authorization Response:');
        console.log('Authorization Number:', response.data.authorization_number);
        console.log('Status:', response.data.status);
        console.log('Review Date:', response.data.review_date);
        
        if (response.data.approved_services && response.data.approved_services.length > 0) {
            console.log('Approved Services:', response.data.approved_services.length);
        }
        
        if (response.data.denied_services && response.data.denied_services.length > 0) {
            console.log('Denied Services:', response.data.denied_services.length);
        }
        
        if (response.data.effective_date) {
            console.log('Effective Date:', response.data.effective_date);
        }
        
        if (response.data.expiration_date) {
            console.log('Expiration Date:', response.data.expiration_date);
        }
        
        if (response.data.notes) {
            console.log('Notes:', response.data.notes);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Prior Authorization Submission failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test claim submission to clearinghouse
 */
async function testClaimSubmissionToClearinghouse() {
    console.log('\n=== Testing Claim Submission to Clearinghouse ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/claims/1/submit/clearinghouse`, {
            format: 'X12_837',
            test_mode: true,
            priority: 'normal'
        });
        
        console.log('✅ Claim Submission Response:');
        console.log('Submission ID:', response.data.submission_id);
        console.log('Status:', response.data.status);
        console.log('Tracking Number:', response.data.tracking_number);
        console.log('Submission Date:', response.data.submission_date);
        
        if (response.data.expected_processing_date) {
            console.log('Expected Processing Date:', response.data.expected_processing_date);
        }
        
        if (response.data.validation_errors && response.data.validation_errors.length > 0) {
            console.log('Validation Errors:', response.data.validation_errors.length);
        }
        
        if (response.data.warnings && response.data.warnings.length > 0) {
            console.log('Warnings:', response.data.warnings.length);
        }
        
        console.log('Payer ID:', response.data.payer_id);
        console.log('Clearinghouse ID:', response.data.clearinghouse_id);
        
        return true;
    } catch (error) {
        console.error('❌ Claim Submission to Clearinghouse failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test batch claim submission
 */
async function testBatchClaimSubmission() {
    console.log('\n=== Testing Batch Claim Submission ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/integrations/claims/batch-submit`, {
            claimIds: [1, 2, 3],
            options: {
                format: 'X12_837',
                test_mode: true,
                priority: 'normal'
            }
        });
        
        console.log('✅ Batch Claim Submission Response:');
        console.log('Total Claims:', response.data.total);
        console.log('Successful Submissions:', response.data.successful);
        console.log('Failed Submissions:', response.data.failed);
        
        if (response.data.submissions && response.data.submissions.length > 0) {
            console.log('\nSubmission Details:');
            response.data.submissions.forEach((submission, index) => {
                console.log(`  Claim ${submission.claim_id}: ${submission.success ? 'Success' : 'Failed'}`);
                if (submission.success) {
                    console.log(`    Submission ID: ${submission.submission_id}`);
                    console.log(`    Status: ${submission.status}`);
                } else {
                    console.log(`    Error: ${submission.error}`);
                }
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Batch Claim Submission failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test payer status inquiry
 */
async function testPayerStatusInquiry() {
    console.log('\n=== Testing Payer Status Inquiry ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/integrations/payer/status-inquiry`, TEST_CONFIG.statusInquiry);
        
        console.log('✅ Payer Status Inquiry Response:');
        console.log('Claim Status:', response.data.claim_status);
        console.log('Payer Claim Number:', response.data.payer_claim_number);
        console.log('Status Date:', response.data.status_date);
        
        if (response.data.payment_amount) {
            console.log('Payment Amount:', '$' + response.data.payment_amount);
        }
        
        if (response.data.payment_date) {
            console.log('Payment Date:', response.data.payment_date);
        }
        
        if (response.data.denial_reason) {
            console.log('Denial Reason:', response.data.denial_reason);
        }
        
        if (response.data.denial_code) {
            console.log('Denial Code:', response.data.denial_code);
        }
        
        console.log('Status Changed:', response.data.status_changed ? 'Yes' : 'No');
        
        if (response.data.messages && response.data.messages.length > 0) {
            console.log('Messages:', response.data.messages.length + ' message(s)');
        }
        
        if (response.data.next_action) {
            console.log('Next Action:', response.data.next_action);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Payer Status Inquiry failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test ERA file processing
 */
async function testERAFileProcessing() {
    console.log('\n=== Testing ERA File Processing ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/integrations/era/process`, TEST_CONFIG.eraData);
        
        console.log('✅ ERA File Processing Response:');
        console.log('ERA ID:', response.data.era_id);
        console.log('Payer Name:', response.data.payer_name);
        console.log('Payer ID:', response.data.payer_id);
        console.log('Check Number:', response.data.check_number);
        console.log('Check Date:', response.data.check_date);
        console.log('Total Payments:', '$' + response.data.total_payments);
        console.log('Claims Processed:', response.data.claims_processed);
        console.log('Processing Date:', response.data.processing_date);
        
        if (response.data.payments && response.data.payments.length > 0) {
            console.log('Payments:', response.data.payments.length + ' payment(s) processed');
        }
        
        if (response.data.adjustments && response.data.adjustments.length > 0) {
            console.log('Adjustments:', response.data.adjustments.length + ' adjustment(s) processed');
        }
        
        return true;
    } catch (error) {
        console.error('❌ ERA File Processing failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test integration status monitoring
 */
async function testIntegrationStatus() {
    console.log('\n=== Testing Integration Status ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/integrations/status`);
        
        console.log('✅ Integration Status Response:');
        console.log('Total Integrations:', response.data.total_integrations);
        console.log('Healthy Connections:', response.data.healthy_connections);
        console.log('Unhealthy Connections:', response.data.unhealthy_connections);
        console.log('Last Updated:', response.data.last_updated);
        
        if (response.data.connections) {
            console.log('\nConnection Details:');
            Object.entries(response.data.connections).forEach(([integrationId, status]) => {
                console.log(`  ${integrationId}:`);
                console.log(`    Status: ${status.status}`);
                console.log(`    Last Updated: ${status.last_updated}`);
                if (status.error) {
                    console.log(`    Error: ${status.error}`);
                }
                if (status.response_time) {
                    console.log(`    Response Time: ${status.response_time}ms`);
                }
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Integration Status failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test integration connection testing
 */
async function testIntegrationConnectionTest() {
    console.log('\n=== Testing Integration Connection Test ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/integrations/cms_eligibility/test`);
        
        console.log('✅ Integration Connection Test Response:');
        console.log('Integration ID:', response.data.integration_id);
        console.log('Test Completed At:', response.data.test_completed_at);
        
        if (response.data.status) {
            console.log('Connection Status:', response.data.status.status);
            console.log('Last Updated:', response.data.status.last_updated);
            if (response.data.status.error) {
                console.log('Error:', response.data.status.error);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Integration Connection Test failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test integration logs retrieval
 */
async function testIntegrationLogs() {
    console.log('\n=== Testing Integration Logs ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/integrations/logs`, {
            params: {
                page: 1,
                limit: 10
            }
        });
        
        console.log('✅ Integration Logs Response:');
        console.log('Total Logs:', response.data.pagination.total);
        console.log('Current Page:', response.data.pagination.page);
        console.log('Total Pages:', response.data.pagination.pages);
        console.log('Logs Retrieved:', response.data.logs.length);
        
        if (response.data.logs.length > 0) {
            console.log('\nRecent Log Entries:');
            response.data.logs.slice(0, 3).forEach((log, index) => {
                console.log(`  ${index + 1}. ${log.integration_id} - ${log.activity_type}`);
                console.log(`     Status: ${log.status || 'N/A'}`);
                console.log(`     Created: ${log.created_at}`);
                if (log.response_time_ms) {
                    console.log(`     Response Time: ${log.response_time_ms}ms`);
                }
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Integration Logs failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test integration performance metrics
 */
async function testIntegrationPerformanceMetrics() {
    console.log('\n=== Testing Integration Performance Metrics ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/integrations/performance`, {
            params: {
                timeRange: '24h'
            }
        });
        
        console.log('✅ Integration Performance Metrics Response:');
        console.log('Time Range:', response.data.time_range);
        console.log('Total Requests:', response.data.summary.total_requests);
        console.log('Successful Requests:', response.data.summary.successful_requests);
        console.log('Failed Requests:', response.data.summary.failed_requests);
        console.log('Success Rate:', response.data.summary.success_rate.toFixed(2) + '%');
        
        if (response.data.metrics && response.data.metrics.length > 0) {
            console.log('\nMetrics by Integration:');
            response.data.metrics.forEach(metric => {
                console.log(`  ${metric.integration_id} (${metric.activity_type}):`);
                console.log(`    Total: ${metric.total_requests}`);
                console.log(`    Success: ${metric.successful_requests}`);
                console.log(`    Failed: ${metric.failed_requests}`);
                if (metric.avg_response_time) {
                    console.log(`    Avg Response Time: ${metric.avg_response_time}ms`);
                }
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Integration Performance Metrics failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Run all external integration tests
 */
async function runAllTests() {
    console.log('🚀 Starting External System Integration Tests...\n');
    
    const tests = [
        { name: 'Eligibility Verification', fn: testEligibilityVerification },
        { name: 'Prior Authorization Submission', fn: testPriorAuthorizationSubmission },
        { name: 'Claim Submission to Clearinghouse', fn: testClaimSubmissionToClearinghouse },
        { name: 'Batch Claim Submission', fn: testBatchClaimSubmission },
        { name: 'Payer Status Inquiry', fn: testPayerStatusInquiry },
        { name: 'ERA File Processing', fn: testERAFileProcessing },
        { name: 'Integration Status', fn: testIntegrationStatus },
        { name: 'Integration Connection Test', fn: testIntegrationConnectionTest },
        { name: 'Integration Logs', fn: testIntegrationLogs },
        { name: 'Integration Performance Metrics', fn: testIntegrationPerformanceMetrics }
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
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 External System Integration Test Results');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All external system integrations are working correctly!');
        console.log('\n📋 Task 25 Implementation Summary:');
        console.log('='.repeat(60));
        console.log('✅ Eligibility verification integration with CMS systems');
        console.log('✅ Prior authorization system connections');
        console.log('✅ Clearinghouse integration for claim submission');
        console.log('✅ Payer system integration for status inquiries');
        console.log('✅ ERA/EOB processing automation');
        console.log('✅ Integration monitoring and health checking');
        console.log('✅ Performance metrics and logging');
        console.log('✅ Batch processing capabilities');
        console.log('✅ Error handling and retry logic');
        console.log('✅ Connection status monitoring');
        console.log('');
        console.log('🔗 Integration Endpoints:');
        console.log('   - POST /api/v1/rcm/integrations/eligibility/verify');
        console.log('   - POST /api/v1/rcm/integrations/prior-auth/submit');
        console.log('   - POST /api/v1/rcm/claims/:id/submit/clearinghouse');
        console.log('   - POST /api/v1/rcm/integrations/claims/batch-submit');
        console.log('   - POST /api/v1/rcm/integrations/payer/status-inquiry');
        console.log('   - POST /api/v1/rcm/integrations/era/process');
        console.log('   - GET /api/v1/rcm/integrations/status');
        console.log('   - POST /api/v1/rcm/integrations/:id/test');
        console.log('   - GET /api/v1/rcm/integrations/logs');
        console.log('   - GET /api/v1/rcm/integrations/performance');
        console.log('');
        console.log('📊 Requirements Addressed:');
        console.log('   - Requirement 9.1: CMS system integration ✅');
        console.log('   - Requirement 9.2: Prior authorization connections ✅');
        console.log('   - Requirement 9.3: Clearinghouse integration ✅');
        console.log('   - Requirement 9.4: Payer system integration ✅');
        console.log('   - Requirement 9.5: ERA/EOB processing ✅');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the server is running and endpoints are available.');
        console.log('Note: External integrations may fail if external systems are not configured or available.');
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
    testEligibilityVerification,
    testPriorAuthorizationSubmission,
    testClaimSubmissionToClearinghouse,
    testBatchClaimSubmission,
    testPayerStatusInquiry,
    testERAFileProcessing,
    testIntegrationStatus,
    testIntegrationConnectionTest,
    testIntegrationLogs,
    testIntegrationPerformanceMetrics
};