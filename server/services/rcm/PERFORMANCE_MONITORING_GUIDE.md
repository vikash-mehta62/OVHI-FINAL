# RCM Performance Monitoring Guide

## Overview

This guide covers the comprehensive performance monitoring and optimization features implemented for the RCM (Revenue Cycle Management) module. The system includes database query optimization, performance metrics collection, and automated recommendations.

## Features

### 1. Database Query Performance Monitoring

#### Automatic Query Timing
- All database queries are automatically timed
- Slow queries (>1000ms by default) are logged and tracked
- Query types are categorized and counted
- Memory usage tracking for complex queries

#### Configuration
```javascript
// Environment variables for performance monitoring
SLOW_QUERY_THRESHOLD=1000        // Milliseconds
LOG_SLOW_QUERIES=true           // Enable slow query logging
NODE_ENV=production             // Disable verbose logging in production
```

#### Query Metrics Collected
- Total queries executed
- Average response time
- Slow query count and details
- Query type distribution (SELECT, INSERT, UPDATE, DELETE)
- Memory usage deltas

### 2. Database Optimization

#### Indexes Created
The system includes optimized indexes for RCM operations:

```sql
-- Primary composite indexes for dashboard queries
CREATE INDEX idx_billings_status_created ON billings (status, created);
CREATE INDEX idx_billings_status_service_date ON billings (status, service_date);

-- A/R aging optimization
CREATE INDEX idx_billings_ar_aging ON billings (status, service_date, total_amount) 
WHERE status IN (1, 3);

-- Patient lookups
CREATE INDEX idx_billings_patient_id_status ON billings (patient_id, status);

-- Denial analytics
CREATE INDEX idx_billings_denial_reason_created ON billings (status, denial_reason, created) 
WHERE status = 3;
```

#### Query Optimizations
- Single-query dashboard data retrieval with subqueries
- Covering indexes to avoid table lookups
- Efficient WHERE clause ordering (most selective conditions first)
- Window functions for complex aggregations
- CTEs (Common Table Expressions) for readable complex queries

### 3. Caching System

#### Service-Level Caching
- In-memory caching with configurable TTL (5 minutes default)
- Cache key generation based on query parameters
- Automatic cache invalidation
- Cache hit rate monitoring

#### Cache Usage
```javascript
const rcmService = new OptimizedRCMService();

// Data is cached automatically
const dashboardData = await rcmService.getDashboardData({ timeframe: '30d' });

// Clear specific cache
rcmService.clearCache('dashboard_30d_all');

// Clear all cache
rcmService.clearCache();
```

### 4. Performance Monitoring APIs

#### Get Performance Statistics
```http
GET /api/rcm/performance/stats
```

Returns comprehensive performance data:
- Database index statistics
- Table statistics (row counts, sizes)
- Query performance metrics
- Cache statistics
- Performance recommendations

#### Get Query Metrics
```http
GET /api/rcm/performance/metrics
```

Returns real-time query performance metrics:
- Total queries executed
- Average response time
- Slow query details
- Query type distribution

#### Reset Performance Metrics
```http
POST /api/rcm/performance/reset
```

Resets all performance counters and clears cache.

### 5. Performance Recommendations

The system automatically generates performance recommendations based on:

#### Slow Query Detection
- Identifies queries exceeding threshold
- Suggests index additions
- Recommends query optimization

#### Response Time Analysis
- Monitors average response times
- Suggests connection pool tuning
- Recommends caching strategies

#### Index Usage Analysis
- Identifies missing indexes on large tables
- Suggests composite indexes for common query patterns
- Recommends index maintenance

#### Cache Utilization
- Monitors cache hit rates
- Suggests caching opportunities
- Identifies cache misses

## Usage Examples

### 1. Monitor Dashboard Performance

```javascript
const OptimizedRCMService = require('./services/rcm/optimizedRCMService');
const rcmService = new OptimizedRCMService();

// Get dashboard data with performance monitoring
const startTime = Date.now();
const dashboardData = await rcmService.getDashboardData({ timeframe: '30d' });
const executionTime = Date.now() - startTime;

console.log(`Dashboard loaded in ${executionTime}ms`);
console.log(`Cache hit: ${dashboardData.cached}`);
```

### 2. Analyze Query Performance

```javascript
const { executeQueryWithAnalysis } = require('./utils/dbUtils');

const result = await executeQueryWithAnalysis(
  'SELECT * FROM billings WHERE status = ? AND service_date >= ?',
  [1, '2024-01-01']
);

console.log('Query Performance:', result.performance);
// Output: { executionTime: 45, memoryUsage: {...}, resultCount: 150, isSlowQuery: false }
```

### 3. Get Performance Recommendations

```javascript
const performanceStats = await rcmService.getQueryPerformanceStats();

performanceStats.recommendations.forEach(rec => {
  console.log(`[${rec.severity}] ${rec.message}`);
  console.log(`Action: ${rec.action}`);
});
```

## Best Practices

### 1. Query Optimization
- Use appropriate WHERE clause ordering
- Leverage covering indexes
- Avoid SELECT * in production
- Use LIMIT for large result sets
- Consider using EXISTS instead of IN for subqueries

### 2. Index Management
- Regularly analyze table statistics: `ANALYZE TABLE billings, patients, payments`
- Monitor index usage and remove unused indexes
- Consider partitioning for very large tables
- Use composite indexes for multi-column queries

### 3. Caching Strategy
- Cache frequently accessed dashboard data
- Use appropriate cache TTL based on data volatility
- Implement cache warming for critical data
- Monitor cache hit rates and adjust strategies

### 4. Performance Monitoring
- Set up alerts for slow queries
- Monitor average response times
- Track cache hit rates
- Review performance recommendations regularly

## Troubleshooting

### Common Issues

#### High Response Times
1. Check for slow queries in metrics
2. Review index usage statistics
3. Consider query optimization
4. Verify connection pool settings

#### Low Cache Hit Rates
1. Review cache TTL settings
2. Check cache key generation
3. Monitor cache invalidation patterns
4. Consider cache warming strategies

#### Memory Usage Issues
1. Monitor query memory usage
2. Optimize large result sets
3. Consider pagination for large queries
4. Review connection pool size

### Performance Testing

Run the performance test script:
```bash
node server/test-performance-monitoring.js
```

This will:
- Test query performance monitoring
- Verify slow query detection
- Check cache performance
- Generate performance recommendations

## Monitoring Dashboard

The performance monitoring system provides real-time insights through:

1. **Query Performance Metrics**
   - Total queries executed
   - Average response time
   - Slow query count and details

2. **Database Statistics**
   - Index usage statistics
   - Table sizes and row counts
   - Connection pool status

3. **Cache Performance**
   - Cache hit rates
   - Cache size and utilization
   - Cache key distribution

4. **Automated Recommendations**
   - Performance optimization suggestions
   - Index recommendations
   - Caching opportunities

## Future Enhancements

1. **Advanced Analytics**
   - Query pattern analysis
   - Predictive performance modeling
   - Automated index suggestions

2. **Real-time Monitoring**
   - WebSocket-based performance dashboards
   - Real-time alerts for performance issues
   - Automated performance reports

3. **Machine Learning**
   - Intelligent query optimization
   - Predictive caching
   - Anomaly detection

## Conclusion

The RCM performance monitoring system provides comprehensive insights into database performance, query optimization, and caching effectiveness. By following the best practices and monitoring the provided metrics, you can ensure optimal performance for the RCM module.

For questions or issues, refer to the troubleshooting section or contact the development team.