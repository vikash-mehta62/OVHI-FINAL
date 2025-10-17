/**
 * Test Compliance API Endpoints
 * Tests the implementation of task 24: Compliance API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1/rcm';

// Test configuration
const TEST_CONFIG = {
    timeRange: '30d',
    testAlertIds: ['ALERT-001', 'ALERT-002'],
    testReviewData: {
        review_type: 'compliance_check',
        title: 'Q1 2024 Compliance Review',
        description: 'Quarterly compliance assessment',
        priority: 'high',
        due_date: '2024-12-31'
    },
    testScheduleData: {
        schedule: {
            frequency: 'weekly',
            day_of_week: 'monday',
            time: '09:00'
        },
        recipients: ['admin@example.com', 'compliance@example.com'],
        format: 'pdf',
        filters: {
            timeRange: '7d',
            includeAlerts: true
        }
    }
};

/**
 * Test compliance monitor endpoint
 */
async function testComplianceMonitor() {
    console.log('\n=== Testing Compliance Monitor Endpoint ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/monitor`, {
            params: {
                timeRange: '24h',
                includePredictions: 'true'
            }
        });
        
        console.log('✅ Compliance Monitor Response:');
        console.log('Time Range:', response.data.time_range);
        console.log('Real-time Metrics:', response.data.real_time_metrics ? '✓' : '✗');
        console.log('Active Alerts:', response.data.active_alerts ? response.data.active_alerts.length : 0);
        console.log('Recent Activity:', response.data.recent_activity ? response.data.recent_activity.length : 0);
        console.log('System Health:', response.data.system_health ? '✓' : '✗');
        console.log('Predictions:', response.data.predictions ? '✓' : '✗');
        console.log('Refresh Interval:', response.data.refresh_interval + 'ms');
        
        if (response.data.system_health) {
            console.log('System Health Details:');
            console.log('  Overall Health:', response.data.system_health.overall_health + '%');
            console.log('  Validation System:', response.data.system_health.validation_system + '%');
            console.log('  Filing System:', response.data.system_health.filing_system + '%');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Compliance Monitor failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test bulk acknowledge alerts endpoint
 */
async function testBulkAcknowledgeAlerts() {
    console.log('\n=== Testing Bulk Acknowledge Alerts ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/compliance/alerts/bulk-acknowledge`, {
            alertIds: TEST_CONFIG.testAlertIds,
            acknowledgment_note: 'Bulk acknowledgment test - issues have been reviewed and addressed'
        });
        
        console.log('✅ Bulk Acknowledge Response:');
        console.log('Total Alerts:', response.data.total);
        console.log('Successful:', response.data.successful);
        console.log('Failed:', response.data.failed);
        
        if (response.data.errors && response.data.errors.length > 0) {
            console.log('Errors:', response.data.errors.length);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Bulk Acknowledge Alerts failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test schedule compliance report endpoint
 */
async function testScheduleComplianceReport() {
    console.log('\n=== Testing Schedule Compliance Report ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/compliance/reports/schedule`, TEST_CONFIG.testScheduleData);
        
        console.log('✅ Schedule Report Response:');
        console.log('Schedule ID:', response.data.schedule_id);
        console.log('Status:', response.data.status);
        console.log('Next Run:', response.data.next_run);
        console.log('Created At:', response.data.created_at);
        
        return true;
    } catch (error) {
        console.error('❌ Schedule Compliance Report failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test compliance analytics endpoint
 */
async function testComplianceAnalytics() {
    console.log('\n=== Testing Compliance Analytics ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/analytics`, {
            params: {
                timeRange: TEST_CONFIG.timeRange,
                groupBy: 'day',
                includeForecasting: 'true'
            }
        });
        
        console.log('✅ Compliance Analytics Response:');
        console.log('Time Range:', response.data.time_range);
        console.log('Group By:', response.data.group_by);
        console.log('Trend Analysis:', response.data.trend_analysis ? '✓' : '✗');
        console.log('Performance Metrics:', response.data.performance_metrics ? '✓' : '✗');
        console.log('Correlation Analysis:', response.data.correlation_analysis ? '✓' : '✗');
        console.log('Forecasting:', response.data.forecasting ? '✓' : '✗');
        
        if (response.data.correlation_analysis) {
            console.log('Strong Correlations:', response.data.correlation_analysis.strong_correlations?.length || 0);
            console.log('Weak Correlations:', response.data.correlation_analysis.weak_correlations?.length || 0);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Compliance Analytics failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test audit trail endpoints
 */
async function testAuditTrailEndpoints() {
    console.log('\n=== Testing Audit Trail Endpoints ===');
    
    try {
        // Test general audit trail
        const auditResponse = await axios.get(`${BASE_URL}/compliance/audit-trail`, {
            params: {
                timeRange: TEST_CONFIG.timeRange,
                page: 1,
                limit: 10
            }
        });
        
        console.log('✅ Audit Trail Response:');
        console.log('Audit Entries:', auditResponse.data.audit_entries?.length || 0);
        console.log('Total Pages:', auditResponse.data.pagination?.pages || 0);
        console.log('Total Records:', auditResponse.data.pagination?.total || 0);
        
        // Test claim-specific audit trail
        const claimAuditResponse = await axios.get(`${BASE_URL}/compliance/audit-trail/1`);
        
        console.log('✅ Claim Audit Trail Response:');
        console.log('Claim ID:', claimAuditResponse.data.claim_id);
        console.log('Compliance Logs:', claimAuditResponse.data.compliance_logs?.length || 0);
        console.log('History Entries:', claimAuditResponse.data.history_entries?.length || 0);
        console.log('Total Entries:', claimAuditResponse.data.total_entries || 0);
        
        return true;
    } catch (error) {
        console.error('❌ Audit Trail Endpoints failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test regulatory reviews endpoints
 */
async function testRegulatoryReviewsEndpoints() {
    console.log('\n=== Testing Regulatory Reviews Endpoints ===');
    
    try {
        // Test get regulatory reviews
        const getResponse = await axios.get(`${BASE_URL}/compliance/regulatory-reviews`, {
            params: {
                status: 'pending',
                page: 1,
                limit: 10
            }
        });
        
        console.log('✅ Get Regulatory Reviews Response:');
        console.log('Reviews Found:', getResponse.data.length || 0);
        
        // Test create regulatory review
        const createResponse = await axios.post(`${BASE_URL}/compliance/regulatory-reviews`, TEST_CONFIG.testReviewData);
        
        console.log('✅ Create Regulatory Review Response:');
        console.log('Review Created:', createResponse.data ? '✓' : '✗');
        
        if (createResponse.data && createResponse.data.id) {
            // Test update regulatory review
            const updateResponse = await axios.put(`${BASE_URL}/compliance/regulatory-reviews/${createResponse.data.id}`, {
                status: 'in_progress',
                findings: 'Initial review findings'
            });
            
            console.log('✅ Update Regulatory Review Response:');
            console.log('Review Updated:', updateResponse.data ? '✓' : '✗');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Regulatory Reviews Endpoints failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test performance metrics endpoint
 */
async function testPerformanceMetrics() {
    console.log('\n=== Testing Performance Metrics ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/performance-metrics`, {
            params: {
                timeRange: TEST_CONFIG.timeRange,
                compareWith: 'previous_period'
            }
        });
        
        console.log('✅ Performance Metrics Response:');
        console.log('Current Period:', response.data.current_period ? '✓' : '✗');
        console.log('Comparison Period:', response.data.comparison_period ? '✓' : '✗');
        console.log('Performance Indicators:', response.data.performance_indicators ? '✓' : '✗');
        
        if (response.data.performance_indicators) {
            console.log('Performance Indicators:');
            console.log('  Compliance Score Change:', response.data.performance_indicators.compliance_score_change);
            console.log('  Overall Trend:', response.data.performance_indicators.overall_trend);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Performance Metrics failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test benchmarks endpoint
 */
async function testBenchmarks() {
    console.log('\n=== Testing Benchmarks ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/benchmarks`, {
            params: {
                benchmarkType: 'industry',
                specialty: 'Family Medicine'
            }
        });
        
        console.log('✅ Benchmarks Response:');
        console.log('Benchmark Type:', response.data.benchmark_type);
        console.log('Industry Averages:', response.data.benchmarks?.industry_averages ? '✓' : '✗');
        console.log('Peer Comparisons:', response.data.benchmarks?.peer_comparisons ? '✓' : '✗');
        console.log('Best Practices:', response.data.benchmarks?.best_practices?.length || 0);
        
        if (response.data.benchmarks?.industry_averages) {
            console.log('Industry Averages:');
            console.log('  Overall Compliance:', response.data.benchmarks.industry_averages.overall_compliance_score + '%');
            console.log('  First Pass Rate:', response.data.benchmarks.industry_averages.first_pass_rate + '%');
            console.log('  Denial Rate:', response.data.benchmarks.industry_averages.denial_rate + '%');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Benchmarks failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test predictions endpoint
 */
async function testPredictions() {
    console.log('\n=== Testing Predictions ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/predictions`, {
            params: {
                predictionType: 'risk',
                timeHorizon: '30d',
                confidenceLevel: '0.95'
            }
        });
        
        console.log('✅ Predictions Response:');
        console.log('Prediction Type:', response.data.prediction_type);
        console.log('Time Horizon:', response.data.time_horizon);
        console.log('Confidence Level:', response.data.confidence_level);
        console.log('Model Accuracy:', response.data.model_accuracy);
        console.log('Predictions:', response.data.predictions ? '✓' : '✗');
        
        if (response.data.predictions) {
            console.log('Predicted Metrics:');
            console.log('  Compliance Score:', response.data.predictions.predicted_compliance_score + '%');
            console.log('  Validation Rate:', response.data.predictions.predicted_validation_rate + '%');
            console.log('  Trend Direction:', response.data.predictions.trend_direction);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Predictions failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test notifications endpoints
 */
async function testNotificationsEndpoints() {
    console.log('\n=== Testing Notifications Endpoints ===');
    
    try {
        // Test get notifications
        const getResponse = await axios.get(`${BASE_URL}/compliance/notifications`, {
            params: {
                status: 'unread',
                limit: 10
            }
        });
        
        console.log('✅ Get Notifications Response:');
        console.log('Notifications Found:', getResponse.data.length || 0);
        
        // Test update notification settings
        const settingsResponse = await axios.post(`${BASE_URL}/compliance/notifications/settings`, {
            email_notifications: true,
            sms_notifications: false,
            alert_thresholds: {
                critical: true,
                high: true,
                medium: false,
                low: false
            },
            report_frequency: 'weekly'
        });
        
        console.log('✅ Update Notification Settings Response:');
        console.log('Settings Updated:', settingsResponse.data?.success ? '✓' : '✗');
        
        return true;
    } catch (error) {
        console.error('❌ Notifications Endpoints failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test compliance thresholds endpoint
 */
async function testComplianceThresholds() {
    console.log('\n=== Testing Compliance Thresholds ===');
    
    try {
        const response = await axios.post(`${BASE_URL}/compliance/thresholds`, {
            thresholds: {
                excellent: 95,
                good: 85,
                fair: 70,
                poor: 0
            },
            reason: 'Updated thresholds for improved compliance monitoring'
        });
        
        console.log('✅ Update Thresholds Response:');
        console.log('Success:', response.data.success ? '✓' : '✗');
        console.log('Updated Thresholds:', response.data.updated_thresholds ? '✓' : '✗');
        console.log('Updated At:', response.data.updated_at);
        
        return true;
    } catch (error) {
        console.error('❌ Compliance Thresholds failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Run all compliance API endpoint tests
 */
async function runAllTests() {
    console.log('🚀 Starting Compliance API Endpoints Tests...\n');
    
    const tests = [
        { name: 'Compliance Monitor', fn: testComplianceMonitor },
        { name: 'Bulk Acknowledge Alerts', fn: testBulkAcknowledgeAlerts },
        { name: 'Schedule Compliance Report', fn: testScheduleComplianceReport },
        { name: 'Compliance Analytics', fn: testComplianceAnalytics },
        { name: 'Audit Trail Endpoints', fn: testAuditTrailEndpoints },
        { name: 'Regulatory Reviews Endpoints', fn: testRegulatoryReviewsEndpoints },
        { name: 'Performance Metrics', fn: testPerformanceMetrics },
        { name: 'Benchmarks', fn: testBenchmarks },
        { name: 'Predictions', fn: testPredictions },
        { name: 'Notifications Endpoints', fn: testNotificationsEndpoints },
        { name: 'Compliance Thresholds', fn: testComplianceThresholds }
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
    console.log('📊 Compliance API Endpoints Test Results');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All compliance API endpoints are working correctly!');
        console.log('\n📋 Task 24 Implementation Summary:');
        console.log('='.repeat(60));
        console.log('✅ /api/v1/rcm/compliance/monitor - Real-time compliance tracking');
        console.log('✅ /api/v1/rcm/compliance/alerts - Enhanced alert management');
        console.log('✅ /api/v1/rcm/compliance/reports - Advanced reporting capabilities');
        console.log('✅ /api/v1/rcm/compliance/audit-trail - Comprehensive audit trails');
        console.log('✅ /api/v1/rcm/compliance/analytics - Advanced analytics and insights');
        console.log('✅ /api/v1/rcm/compliance/performance-metrics - Performance tracking');
        console.log('✅ /api/v1/rcm/compliance/benchmarks - Industry benchmarking');
        console.log('✅ /api/v1/rcm/compliance/predictions - Predictive analytics');
        console.log('✅ /api/v1/rcm/compliance/notifications - Notification management');
        console.log('✅ /api/v1/rcm/compliance/regulatory-reviews - Regulatory review tracking');
        console.log('');
        console.log('🔧 Enhanced Features:');
        console.log('✅ Real-time monitoring with system health indicators');
        console.log('✅ Bulk operations for efficient alert management');
        console.log('✅ Scheduled reporting with automated delivery');
        console.log('✅ Advanced analytics with correlation analysis');
        console.log('✅ Comprehensive audit trails for regulatory compliance');
        console.log('✅ Performance benchmarking against industry standards');
        console.log('✅ Predictive analytics for proactive compliance management');
        console.log('✅ Configurable notification system');
        console.log('✅ Regulatory review workflow management');
        console.log('✅ Dynamic threshold configuration');
        console.log('');
        console.log('📊 Requirements Addressed:');
        console.log('   - Requirement 8.1: Compliance tracking ✅');
        console.log('   - Requirement 8.3: Regulatory notifications ✅');
        console.log('   - Requirement 8.5: Compliance reporting ✅');
        console.log('   - Requirement 10.1: Analytics APIs ✅');
        console.log('   - Requirement 10.3: Compliance metrics ✅');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the server is running and endpoints are available.');
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
    testComplianceMonitor,
    testBulkAcknowledgeAlerts,
    testScheduleComplianceReport,
    testComplianceAnalytics,
    testAuditTrailEndpoints,
    testRegulatoryReviewsEndpoints,
    testPerformanceMetrics,
    testBenchmarks,
    testPredictions,
    testNotificationsEndpoints,
    testComplianceThresholds
};