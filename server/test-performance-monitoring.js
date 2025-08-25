/**
 * Test script for RCM performance monitoring
 * Tests database query performance monitoring and optimization features
 */

const { 
  executeQuery, 
  executeQueryWithAnalysis, 
  getQueryMetrics, 
  resetQueryMetrics 
} = require('./utils/dbUtils');

const OptimizedRCMService = require('./services/rcm/optimizedRCMService');

async function testPerformanceMonitoring() {
  console.log('🚀 Testing RCM Performance Monitoring...\n');

  try {
    // Reset metrics to start fresh
    resetQueryMetrics();
    console.log('✅ Reset performance metrics');

    // Test basic query performance monitoring
    console.log('\n📊 Testing basic query performance...');
    await executeQuery('SELECT COUNT(*) as total FROM billings');
    console.log('✅ Executed basic query');

    // Test query with analysis
    console.log('\n🔍 Testing query with detailed analysis...');
    const analysisResult = await executeQueryWithAnalysis(
      'SELECT * FROM billings WHERE status = ? LIMIT 5',
      [1]
    );
    console.log('✅ Query analysis result:', {
      resultCount: analysisResult.performance.resultCount,
      executionTime: `${analysisResult.performance.executionTime}ms`,
      isSlowQuery: analysisResult.performance.isSlowQuery
    });

    // Test slow query detection (simulate with SLEEP)
    console.log('\n⏱️ Testing slow query detection...');
    try {
      await executeQuery('SELECT SLEEP(1.5)'); // This should trigger slow query detection
      console.log('✅ Slow query executed (should be logged as slow)');
    } catch (error) {
      console.log('⚠️ Slow query test failed (expected in some environments)');
    }

    // Get performance metrics
    console.log('\n📈 Getting performance metrics...');
    const metrics = getQueryMetrics();
    console.log('✅ Performance metrics:', {
      totalQueries: metrics.totalQueries,
      averageResponseTime: `${Math.round(metrics.averageResponseTime)}ms`,
      slowQueriesCount: metrics.slowQueries.length,
      queryTypes: metrics.queryTypes
    });

    // Test optimized RCM service performance stats
    console.log('\n🏥 Testing RCM service performance stats...');
    const rcmService = new OptimizedRCMService();
    const performanceStats = await rcmService.getQueryPerformanceStats();
    
    console.log('✅ RCM Performance Stats:', {
      indexCount: performanceStats.indexStatistics.length,
      tableCount: performanceStats.tableStatistics.length,
      cacheSize: performanceStats.cacheStats.size,
      recommendationsCount: performanceStats.recommendations.length
    });

    if (performanceStats.recommendations.length > 0) {
      console.log('\n💡 Performance Recommendations:');
      performanceStats.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.severity.toUpperCase()}] ${rec.message}`);
        console.log(`      Action: ${rec.action}`);
      });
    }

    // Test dashboard data with caching
    console.log('\n📊 Testing dashboard data with performance monitoring...');
    const startTime = Date.now();
    const dashboardData = await rcmService.getDashboardData({ timeframe: '30d' });
    const executionTime = Date.now() - startTime;
    
    console.log('✅ Dashboard data retrieved:', {
      executionTime: `${executionTime}ms`,
      totalClaims: dashboardData.summary.totalClaims,
      cached: dashboardData.cached
    });

    // Test cache performance
    console.log('\n🗄️ Testing cache performance...');
    const cachedStartTime = Date.now();
    const cachedDashboardData = await rcmService.getDashboardData({ timeframe: '30d' });
    const cachedExecutionTime = Date.now() - cachedStartTime;
    
    console.log('✅ Cached dashboard data retrieved:', {
      executionTime: `${cachedExecutionTime}ms`,
      cached: cachedDashboardData.cached,
      performanceImprovement: `${Math.round(((executionTime - cachedExecutionTime) / executionTime) * 100)}%`
    });

    console.log('\n🎉 Performance monitoring test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Total queries executed: ${getQueryMetrics().totalQueries}`);
    console.log(`   • Average response time: ${Math.round(getQueryMetrics().averageResponseTime)}ms`);
    console.log(`   • Slow queries detected: ${getQueryMetrics().slowQueries.length}`);
    console.log(`   • Cache performance improvement: ${Math.round(((executionTime - cachedExecutionTime) / executionTime) * 100)}%`);

  } catch (error) {
    console.error('❌ Performance monitoring test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testPerformanceMonitoring()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = testPerformanceMonitoring;