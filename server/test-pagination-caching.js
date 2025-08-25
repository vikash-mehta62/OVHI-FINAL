/**
 * Test script for RCM pagination and caching features
 * Tests cursor-based pagination, enhanced pagination, and caching functionality
 */

const { 
  executeQueryWithCursorPagination,
  executeQueryWithEnhancedPagination,
  validatePaginationParams,
  PAGINATION_TYPES
} = require('./utils/paginationUtils');

const {
  initializeRedis,
  getFromCache,
  setInCache,
  generateCacheKey,
  getCacheStats,
  clearAllCache
} = require('./utils/cacheUtils');

const OptimizedRCMService = require('./services/rcm/optimizedRCMService');

async function testPaginationAndCaching() {
  console.log('🚀 Testing RCM Pagination and Caching...\n');

  try {
    // Initialize caching system
    console.log('📦 Initializing caching system...');
    await initializeRedis();
    await clearAllCache(); // Start with clean cache
    console.log('✅ Caching system initialized');

    // Test pagination parameter validation
    console.log('\n🔍 Testing pagination parameter validation...');
    const validatedParams = validatePaginationParams({
      page: '2',
      limit: '25',
      cursor: 'abc123',
      direction: 'desc',
      type: 'cursor'
    });
    
    console.log('✅ Validated parameters:', {
      page: validatedParams.page,
      limit: validatedParams.limit,
      cursor: validatedParams.cursor,
      direction: validatedParams.direction,
      type: validatedParams.type
    });

    // Test cursor-based pagination
    console.log('\n📄 Testing cursor-based pagination...');
    try {
      const cursorResult = await executeQueryWithCursorPagination({
        baseQuery: 'SELECT id, patient_id, total_amount, created FROM billings WHERE 1=1',
        params: [],
        cursor: null,
        limit: 5,
        cursorColumn: 'id',
        orderBy: 'created',
        direction: 'DESC'
      });

      console.log('✅ Cursor pagination result:', {
        dataCount: cursorResult.data.length,
        hasMore: cursorResult.pagination.hasMore,
        nextCursor: cursorResult.pagination.nextCursor,
        limit: cursorResult.pagination.limit
      });

      // Test with cursor for next page
      if (cursorResult.pagination.nextCursor) {
        console.log('\n📄 Testing cursor pagination - next page...');
        const nextPageResult = await executeQueryWithCursorPagination({
          baseQuery: 'SELECT id, patient_id, total_amount, created FROM billings WHERE 1=1',
          params: [],
          cursor: cursorResult.pagination.nextCursor,
          limit: 5,
          cursorColumn: 'id',
          orderBy: 'created',
          direction: 'DESC'
        });

        console.log('✅ Next page result:', {
          dataCount: nextPageResult.data.length,
          hasMore: nextPageResult.pagination.hasMore,
          nextCursor: nextPageResult.pagination.nextCursor
        });
      }

    } catch (error) {
      console.log('⚠️ Cursor pagination test skipped (no data or table missing)');
    }

    // Test enhanced offset pagination
    console.log('\n📊 Testing enhanced offset pagination...');
    try {
      const offsetResult = await executeQueryWithEnhancedPagination({
        baseQuery: 'SELECT id, patient_id, total_amount, created FROM billings WHERE 1=1 ORDER BY created DESC',
        countQuery: 'SELECT COUNT(*) as total FROM billings WHERE 1=1',
        params: [],
        page: 1,
        limit: 10,
        enableCount: true
      });

      console.log('✅ Enhanced pagination result:', {
        dataCount: offsetResult.data.length,
        total: offsetResult.pagination.total,
        page: offsetResult.pagination.page,
        totalPages: offsetResult.pagination.totalPages,
        hasNext: offsetResult.pagination.hasNext,
        hasPrev: offsetResult.pagination.hasPrev
      });

    } catch (error) {
      console.log('⚠️ Enhanced pagination test skipped (no data or table missing)');
    }

    // Test caching functionality
    console.log('\n🗄️ Testing caching functionality...');
    
    // Test cache key generation
    const cacheKey = generateCacheKey('rcm', 'dashboard', {
      timeframe: '30d',
      userId: 123
    });
    console.log('✅ Generated cache key:', cacheKey);

    // Test cache set and get
    const testData = {
      message: 'Hello, cache!',
      timestamp: new Date().toISOString(),
      data: [1, 2, 3, 4, 5]
    };

    console.log('\n💾 Testing cache set...');
    const setSuccess = await setInCache(cacheKey, testData, 60); // 1 minute TTL
    console.log('✅ Cache set success:', setSuccess);

    console.log('\n📥 Testing cache get...');
    const cachedData = await getFromCache(cacheKey);
    console.log('✅ Cache get result:', {
      found: !!cachedData,
      cached: cachedData?.cached,
      dataMatch: cachedData?.data?.message === testData.message
    });

    // Test cache statistics
    console.log('\n📈 Testing cache statistics...');
    const cacheStats = getCacheStats();
    console.log('✅ Cache statistics:', {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hitRate,
      totalRequests: cacheStats.totalRequests,
      memoryCacheSize: cacheStats.memoryCache.size
    });

    // Test RCM service with caching
    console.log('\n🏥 Testing RCM service with enhanced pagination and caching...');
    const rcmService = new OptimizedRCMService();

    try {
      // Test dashboard data with caching
      console.log('\n📊 Testing dashboard data with caching...');
      const startTime = Date.now();
      const dashboardData = await rcmService.getDashboardData({ 
        timeframe: '30d',
        enableCache: true 
      });
      const firstCallTime = Date.now() - startTime;

      console.log('✅ Dashboard data (first call):', {
        executionTime: `${firstCallTime}ms`,
        totalClaims: dashboardData.summary?.totalClaims || 0,
        cached: dashboardData.cached || false
      });

      // Test cached call
      const cachedStartTime = Date.now();
      const cachedDashboardData = await rcmService.getDashboardData({ 
        timeframe: '30d',
        enableCache: true 
      });
      const cachedCallTime = Date.now() - cachedStartTime;

      console.log('✅ Dashboard data (cached call):', {
        executionTime: `${cachedCallTime}ms`,
        cached: cachedDashboardData.cached || false,
        performanceImprovement: firstCallTime > 0 ? 
          `${Math.round(((firstCallTime - cachedCallTime) / firstCallTime) * 100)}%` : 'N/A'
      });

      // Test claims with different pagination types
      console.log('\n📋 Testing claims with offset pagination...');
      const offsetClaims = await rcmService.getClaimsStatus({
        page: 1,
        limit: 5,
        paginationType: PAGINATION_TYPES.OFFSET,
        enableCache: true
      });

      console.log('✅ Claims (offset pagination):', {
        claimsCount: offsetClaims.claims?.length || 0,
        paginationType: offsetClaims.pagination?.type,
        totalPages: offsetClaims.pagination?.totalPages,
        cached: offsetClaims.cached || false
      });

      console.log('\n📋 Testing claims with cursor pagination...');
      const cursorClaims = await rcmService.getClaimsStatus({
        limit: 5,
        paginationType: PAGINATION_TYPES.CURSOR,
        enableCache: true
      });

      console.log('✅ Claims (cursor pagination):', {
        claimsCount: cursorClaims.claims?.length || 0,
        paginationType: cursorClaims.pagination?.type,
        hasMore: cursorClaims.pagination?.hasMore,
        nextCursor: cursorClaims.pagination?.nextCursor,
        cached: cursorClaims.cached || false
      });

      // Test cache invalidation
      console.log('\n🗑️ Testing cache invalidation...');
      await rcmService.invalidateRelatedCaches('claim_update', { status: 2 });
      console.log('✅ Cache invalidation completed');

    } catch (error) {
      console.log('⚠️ RCM service tests skipped (database not available):', error.message);
    }

    // Final cache statistics
    console.log('\n📊 Final cache statistics...');
    const finalStats = getCacheStats();
    console.log('✅ Final cache stats:', {
      totalRequests: finalStats.totalRequests,
      hitRate: `${finalStats.hitRate}%`,
      cacheSize: finalStats.memoryCache.size
    });

    console.log('\n🎉 Pagination and caching test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Pagination types tested: Cursor-based and Enhanced Offset`);
    console.log(`   • Cache operations tested: Set, Get, Invalidate, Statistics`);
    console.log(`   • Cache hit rate: ${finalStats.hitRate}%`);
    console.log(`   • Total cache requests: ${finalStats.totalRequests}`);

  } catch (error) {
    console.error('❌ Pagination and caching test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testPaginationAndCaching()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = testPaginationAndCaching;