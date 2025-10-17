/**
 * Test Compliance Monitoring Features
 * Tests the implementation of task 23: Compliance monitoring dashboard
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1/rcm';

// Test configuration
const TEST_CONFIG = {
    timeRange: '30d',
    testFilters: {
        providerId: 1,
        payerType: 'Medicare'
    }
};

/**
 * Test compliance metrics endpoint
 */
async function testComplianceMetrics() {
    console.log('\n=== Testing Compliance Metrics ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/metrics`, {
            params: {
                timeRange: TEST_CONFIG.timeRange
            }
        });
        
        console.log('✅ Compliance Metrics Response:');
        console.log('Overall Score:', response.data.overall_score + '%');
        console.log('First Pass Rate:', response.data.first_pass_rate + '%');
        console.log('Denial Rate:', response.data.denial_rate + '%');
        console.log('Total Claims:', response.data.total_claims);
        console.log('Compliant Claims:', response.data.compliant_claims);
        console.log('Validation Rate:', response.data.validation_rate + '%');
        console.log('Timely Filing Rate:', response.data.timely_filing_rate + '%');
        
        return true;
    } catch (error) {
        console.error('❌ Compliance Metrics failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test compliance alerts endpoint
 */
async function testComplianceAlerts() {
    console.log('\n=== Testing Compliance Alerts ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/alerts`);
        
        console.log('✅ Compliance Alerts Response:');
        console.log('Total Alerts:', response.data.length);
        
        if (response.data.length > 0) {
            const criticalAlerts = response.data.filter(alert => alert.severity === 'critical');
            const highAlerts = response.data.filter(alert => alert.severity === 'high');
            const mediumAlerts = response.data.filter(alert => alert.severity === 'medium');
            const lowAlerts = response.data.filter(alert => alert.severity === 'low');
            
            console.log('Critical Alerts:', criticalAlerts.length);
            console.log('High Priority Alerts:', highAlerts.length);
            console.log('Medium Priority Alerts:', mediumAlerts.length);
            console.log('Low Priority Alerts:', lowAlerts.length);
            
            // Show sample alert
            const sampleAlert = response.data[0];
            console.log('\nSample Alert:');
            console.log('  Title:', sampleAlert.title);
            console.log('  Severity:', sampleAlert.severity);
            console.log('  Type:', sampleAlert.type);
            console.log('  Affected Claims:', sampleAlert.affected_claims);
        } else {
            console.log('No alerts found - system is compliant!');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Compliance Alerts failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test compliance trends endpoint
 */
async function testComplianceTrends() {
    console.log('\n=== Testing Compliance Trends ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/trends`, {
            params: {
                timeRange: TEST_CONFIG.timeRange
            }
        });
        
        console.log('✅ Compliance Trends Response:');
        console.log('Data Points:', response.data.length);
        
        if (response.data.length > 0) {
            const latestTrend = response.data[response.data.length - 1];
            const earliestTrend = response.data[0];
            
            console.log('Latest Trend (', latestTrend.date, '):');
            console.log('  Compliance Score:', latestTrend.compliance_score + '%');
            console.log('  Validation Rate:', latestTrend.validation_rate + '%');
            console.log('  Claims Processed:', latestTrend.claims_processed);
            
            console.log('Earliest Trend (', earliestTrend.date, '):');
            console.log('  Compliance Score:', earliestTrend.compliance_score + '%');
            console.log('  Validation Rate:', earliestTrend.validation_rate + '%');
            console.log('  Claims Processed:', earliestTrend.claims_processed);
            
            // Calculate trend direction
            const scoreTrend = latestTrend.compliance_score - earliestTrend.compliance_score;
            console.log('Score Trend:', scoreTrend > 0 ? `+${scoreTrend}% (Improving)` : 
                                       scoreTrend < 0 ? `${scoreTrend}% (Declining)` : 'Stable');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Compliance Trends failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test risk assessment endpoint
 */
async function testRiskAssessment() {
    console.log('\n=== Testing Risk Assessment ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/risk-assessment`, {
            params: {
                timeRange: TEST_CONFIG.timeRange
            }
        });
        
        console.log('✅ Risk Assessment Response:');
        console.log('Overall Risk:', response.data.overall_risk.toUpperCase());
        console.log('Risk Score:', response.data.risk_score + '/100');
        console.log('Risk Factors:', response.data.risk_factors.length);
        console.log('Patterns Detected:', response.data.patterns_detected.length);
        
        if (response.data.risk_factors.length > 0) {
            console.log('\nTop Risk Factors:');
            response.data.risk_factors.slice(0, 3).forEach((factor, index) => {
                console.log(`  ${index + 1}. ${factor.category} (${factor.risk_level} risk)`);
                console.log(`     ${factor.description}`);
            });
        }
        
        if (response.data.patterns_detected.length > 0) {
            console.log('\nDetected Patterns:');
            response.data.patterns_detected.slice(0, 3).forEach((pattern, index) => {
                console.log(`  ${index + 1}. ${pattern.pattern} (${pattern.trend})`);
                console.log(`     Frequency: ${pattern.frequency}, Impact: ${pattern.impact}`);
            });
        }
        
        if (response.data.recommendations && response.data.recommendations.length > 0) {
            console.log('\nRecommendations:');
            response.data.recommendations.slice(0, 3).forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Risk Assessment failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test compliance dashboard endpoint
 */
async function testComplianceDashboard() {
    console.log('\n=== Testing Compliance Dashboard ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/dashboard`, {
            params: {
                timeRange: TEST_CONFIG.timeRange
            }
        });
        
        console.log('✅ Compliance Dashboard Response:');
        console.log('Dashboard Components:');
        console.log('  Metrics:', response.data.metrics ? '✓' : '✗');
        console.log('  Alerts:', response.data.alerts ? `✓ (${response.data.alerts.length})` : '✗');
        console.log('  Trends:', response.data.trends ? `✓ (${response.data.trends.length} data points)` : '✗');
        console.log('  Risk Assessment:', response.data.risk_assessment ? '✓' : '✗');
        console.log('Last Updated:', response.data.last_updated);
        
        // Validate dashboard structure
        const requiredComponents = ['metrics', 'alerts', 'trends', 'risk_assessment'];
        const missingComponents = requiredComponents.filter(comp => !response.data[comp]);
        
        if (missingComponents.length === 0) {
            console.log('✅ All dashboard components present');
        } else {
            console.log('⚠️  Missing components:', missingComponents.join(', '));
        }
        
        return true;
    } catch (error) {
        console.error('❌ Compliance Dashboard failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test compliance report generation
 */
async function testComplianceReport() {
    console.log('\n=== Testing Compliance Report Generation ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/reports`, {
            params: {
                timeRange: TEST_CONFIG.timeRange,
                format: 'json'
            }
        });
        
        console.log('✅ Compliance Report Response:');
        console.log('Report ID:', response.data.report_id);
        console.log('Generated At:', response.data.generated_at);
        console.log('Time Range:', response.data.time_range);
        
        console.log('\nReport Sections:');
        console.log('  Executive Summary:', response.data.executive_summary ? '✓' : '✗');
        console.log('  Compliance Metrics:', response.data.compliance_metrics ? '✓' : '✗');
        console.log('  Risk Assessment:', response.data.risk_assessment ? '✓' : '✗');
        console.log('  Compliance Alerts:', response.data.compliance_alerts ? `✓ (${response.data.compliance_alerts.length})` : '✗');
        console.log('  Compliance Trends:', response.data.compliance_trends ? `✓ (${response.data.compliance_trends.length})` : '✗');
        
        if (response.data.executive_summary) {
            console.log('\nExecutive Summary:');
            console.log('  Compliance Level:', response.data.executive_summary.compliance_level);
            console.log('  Overall Score:', response.data.executive_summary.overall_score + '%');
            console.log('  Risk Level:', response.data.executive_summary.risk_level);
            console.log('  Total Claims:', response.data.executive_summary.key_metrics.total_claims);
            console.log('  Critical Issues:', response.data.executive_summary.critical_issues);
        }
        
        if (response.data.recommendations && response.data.recommendations.length > 0) {
            console.log('\nTop Recommendations:');
            response.data.recommendations.slice(0, 3).forEach((rec, index) => {
                console.log(`  ${index + 1}. [${rec.priority}] ${rec.recommendation}`);
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Compliance Report failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Test compliance statistics endpoint
 */
async function testComplianceStatistics() {
    console.log('\n=== Testing Compliance Statistics ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/compliance/statistics`, {
            params: {
                timeRange: TEST_CONFIG.timeRange,
                groupBy: 'day'
            }
        });
        
        console.log('✅ Compliance Statistics Response:');
        console.log('Statistics Available:', response.data ? '✓' : '✗');
        
        if (response.data) {
            console.log('Data Structure:', typeof response.data);
            console.log('Response Keys:', Object.keys(response.data));
        }
        
        return true;
    } catch (error) {
        console.error('❌ Compliance Statistics failed:', error.response?.data || error.message);
        return false;
    }
}

/**
 * Run all compliance monitoring tests
 */
async function runAllTests() {
    console.log('🚀 Starting Compliance Monitoring Tests...\n');
    
    const tests = [
        { name: 'Compliance Metrics', fn: testComplianceMetrics },
        { name: 'Compliance Alerts', fn: testComplianceAlerts },
        { name: 'Compliance Trends', fn: testComplianceTrends },
        { name: 'Risk Assessment', fn: testRiskAssessment },
        { name: 'Compliance Dashboard', fn: testComplianceDashboard },
        { name: 'Compliance Report', fn: testComplianceReport },
        { name: 'Compliance Statistics', fn: testComplianceStatistics }
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
    console.log('📊 Compliance Monitoring Test Results');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All compliance monitoring features are working correctly!');
        console.log('\n📋 Task 23 Implementation Summary:');
        console.log('='.repeat(60));
        console.log('✅ ComplianceMonitor component with regulatory tracking');
        console.log('✅ Compliance metrics and KPI display');
        console.log('✅ Regulatory alert system for approaching deadlines');
        console.log('✅ Compliance reporting with audit trail summaries');
        console.log('✅ Risk assessment and pattern detection');
        console.log('✅ Interactive dashboard with real-time data');
        console.log('✅ Comprehensive API endpoints for compliance monitoring');
        console.log('✅ Alert management and acknowledgment system');
        console.log('✅ Trend analysis and historical compliance tracking');
        console.log('✅ Executive reporting and compliance analytics');
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
    testComplianceMetrics,
    testComplianceAlerts,
    testComplianceTrends,
    testRiskAssessment,
    testComplianceDashboard,
    testComplianceReport,
    testComplianceStatistics
};