# RCM Monitoring & Logging Implementation Guide

## Overview

This guide covers the comprehensive monitoring and logging system implemented for the RCM (Revenue Cycle Management) backend. The system provides real-time performance monitoring, error tracking, audit logging, and alerting capabilities.

## Architecture

```
Monitoring System Architecture
├── Performance Monitor      # Tracks operation performance and system metrics
├── Error Tracker           # Captures, categorizes, and alerts on errors
├── Audit Logger            # Logs sensitive operations and compliance events
├── Monitoring Service      # Provides dashboard and analytics
├── Monitoring Middleware   # Integrates monitoring into request pipeline
└── Database Schema         # Stores monitoring data and configuration
```

## Components

### 1. Performance Monitor (`utils/performanceMonitor.js`)

**Purpose**: Tracks execution time, memory usage, and system performance metrics.

**Key Features**:
- Operation timing and memory tracking
- System health scoring
- Performance alerts and thresholds
- Slow operation detection
- Memory leak monitoring
- Concurrent operation handling

**Usage**:
```javascript
const { performanceMonitor } = require('./utils/performanceMonitor');

// Start monitoring an operation
const operationId = performanceMonitor.startOperation('database_query', 'query', {
  table: 'claims',
  userId: 'user123'
});

// End monitoring
const metrics = performanceMonitor.endOperation(operationId, {
  success: true,
  rowsAffected: 150
});
```

**Metrics Collected**:
- Execution time (milliseconds)
- Memory usage delta
- CPU usage
- System load averages
- Error rates
- Request throughput

### 2. Error Tracker (`utils/errorTracker.js`)

**Purpose**: Comprehensive error tracking, categorization, and alerting system.

**Key Features**:
- Automatic error categorization
- Severity level assignment
- Pattern detection
- Alert thresholds
- Error statistics and trends
- Stack trace analysis

**Usage**:
```javascript
const { errorTracker } = require('./utils/errorTracker');

try {
  // Your code here
} catch (error) {
  await errorTracker.trackError(error, {
    component: 'RCMService',
    operation: 'processPayment',
    userId: req.user.id,
    metadata: { claimId: '12345' }
  });
}
```

**Error Categories**:
- `DATABASE`: Database connection and query errors
- `AUTHENTICATION`: JWT and auth-related errors
- `VALIDATION`: Input validation failures
- `NETWORK`: Network connectivity issues
- `FILESYSTEM`: File operation errors
- `BUSINESS_LOGIC`: Application logic errors
- `API`: HTTP and API-related errors

**Severity Levels**:
- `CRITICAL`: System-breaking errors requiring immediate attention
- `HIGH`: Significant errors affecting functionality
- `MEDIUM`: Moderate errors with workarounds available
- `LOW`: Minor errors with minimal impact

### 3. Audit Logger (`utils/auditLogger.js`)

**Purpose**: Comprehensive audit logging for compliance and security monitoring.

**Key Features**:
- Tamper-evident logging with checksums
- Multiple audit categories
- Compliance reporting (HIPAA, SOX)
- Search and export capabilities
- Automatic archiving
- Integrity verification

**Usage**:
```javascript
const { auditLogger } = require('./utils/auditLogger');

// Log data access
await auditLogger.logDataAccess(userId, 'patient_records', 'read', {
  resourceId: 'patient-123',
  ipAddress: req.ip,
  userAgent: req.get('User-Agent')
});

// Log financial operation
await auditLogger.logFinancialOperation(userId, 'payment_processed', {
  claimId: 'claim-456',
  amount: 150.00,
  paymentMethod: 'insurance'
});
```

**Audit Categories**:
- `AUTHENTICATION`: Login/logout events
- `DATA_ACCESS`: Data read/write operations
- `FINANCIAL`: Payment and billing operations
- `SYSTEM`: System events and changes
- `SECURITY`: Security-related events
- `COMPLIANCE`: Compliance monitoring events

### 4. Monitoring Service (`services/monitoring/monitoringService.js`)

**Purpose**: Provides comprehensive monitoring dashboard and health checks.

**Key Features**:
- System health monitoring
- Performance metrics aggregation
- Dashboard data compilation
- Health score calculation
- Component status tracking
- Automated recommendations

**Health Checks**:
- Database connectivity and performance
- Memory usage monitoring
- Disk space and accessibility
- API response times and error rates

### 5. Monitoring Middleware (`middleware/monitoring.js`)

**Purpose**: Integrates monitoring into the Express.js request pipeline.

**Middleware Types**:
- **Performance Middleware**: Tracks API request performance
- **Error Tracking Middleware**: Captures and logs application errors
- **Audit Middleware**: Logs data access and modifications
- **Financial Audit Middleware**: Special logging for financial operations
- **Security Middleware**: Detects suspicious activities and rate limiting
- **Compliance Middleware**: Ensures HIPAA and regulatory compliance

**Usage**:
```javascript
const { 
  performanceMiddleware,
  auditMiddleware,
  securityMiddleware 
} = require('./middleware/monitoring');

// Apply to all routes
app.use(performanceMiddleware);
app.use(securityMiddleware);

// Apply to specific routes
app.use('/api/v1/patients', auditMiddleware({
  category: 'DATA_ACCESS',
  resource: 'patient_data',
  logResponse: true
}));
```

## Database Schema

### Core Tables

#### `audit_logs`
Stores all audit log entries with tamper-evident checksums.

```sql
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    category ENUM('AUTHENTICATION', 'DATA_ACCESS', 'FINANCIAL', 'SYSTEM', 'SECURITY', 'COMPLIANCE'),
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(50),
    resource VARCHAR(100),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSON,
    checksum VARCHAR(64) NOT NULL
);
```

#### `error_logs`
Comprehensive error tracking with context and metrics.

```sql
CREATE TABLE error_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    message TEXT NOT NULL,
    category ENUM('DATABASE', 'AUTHENTICATION', 'VALIDATION', 'NETWORK', 'FILESYSTEM', 'BUSINESS_LOGIC', 'API', 'UNKNOWN'),
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    component VARCHAR(100),
    user_id VARCHAR(50),
    metadata JSON
);
```

#### `performance_metrics`
Operation performance tracking and system metrics.

```sql
CREATE TABLE performance_metrics (
    id VARCHAR(50) PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    execution_time DECIMAL(10,3) NOT NULL,
    memory_delta JSON,
    success BOOLEAN NOT NULL DEFAULT TRUE
);
```

### Views and Procedures

The schema includes several views for common queries:
- `recent_errors`: Errors from the last 24 hours
- `error_summary`: Daily error summaries by category
- `performance_summary`: Performance metrics by operation type
- `audit_activity`: Audit log activity summaries

Stored procedures for maintenance:
- `CleanupMonitoringData()`: Removes old monitoring data
- `GetSystemHealthSummary()`: Generates health reports
- `ArchiveOldData()`: Archives old data to separate tables

## API Endpoints

### Monitoring Dashboard
```
GET /api/v1/monitoring/dashboard
```
Returns comprehensive monitoring dashboard data including system metrics, health status, performance data, and recent alerts.

### Health Check
```
GET /api/v1/monitoring/health
```
Simple health check endpoint returning system status and component health.

### Performance Metrics
```
GET /api/v1/monitoring/metrics?type=api_request&days=7
```
Returns performance metrics for specific operation types and time periods.

### Error Statistics
```
GET /api/v1/monitoring/errors?category=DATABASE&severity=HIGH
```
Returns error statistics and recent alerts with filtering options.

### Audit Logs
```
GET /api/v1/monitoring/audit?startDate=2023-01-01&endDate=2023-12-31
```
Returns audit log statistics and activity summaries.

## Setup and Configuration

### 1. Initial Setup
```bash
# Run monitoring setup script
node server/setup-monitoring.js

# Test monitoring system
node server/setup-monitoring.js --test
```

### 2. Database Setup
The setup script automatically creates all required tables, views, and stored procedures. It also inserts default configuration values.

### 3. Application Integration
```javascript
// In your main app.js
const monitoringRoutes = require('./services/monitoring/monitoringRoutes');
const { 
  performanceMiddleware,
  errorTrackingMiddleware,
  securityMiddleware 
} = require('./middleware/monitoring');

// Apply monitoring middleware
app.use(performanceMiddleware);
app.use(securityMiddleware);
app.use(errorTrackingMiddleware);

// Add monitoring routes
app.use('/api/v1/monitoring', monitoringRoutes);
```

## Configuration

### Performance Thresholds
```json
{
  "responseTime": {
    "good": 100,
    "warning": 500,
    "critical": 2000
  },
  "errorRate": {
    "good": 1,
    "warning": 3,
    "critical": 5
  },
  "memoryUsage": {
    "good": 60,
    "warning": 80,
    "critical": 90
  }
}
```

### Alert Settings
```json
{
  "enabled": true,
  "channels": ["console", "database"],
  "cooldownPeriod": 300000
}
```

### Retention Policy
```json
{
  "detailed": 7,
  "summary": 30,
  "archived": 365
}
```

## Alerting System

### Alert Types
- **Performance Alerts**: Slow response times, high error rates
- **System Alerts**: High memory usage, CPU load, disk space
- **Security Alerts**: Suspicious activities, rate limit violations
- **Error Alerts**: Critical errors, error patterns

### Alert Thresholds
- **Critical**: 5 errors in 5 minutes
- **Warning**: 10 errors in 10 minutes
- **Info**: 20 errors in 30 minutes

### Alert Channels
- Console logging
- Database storage
- Email notifications (configurable)
- Webhook integrations (configurable)

## Security and Compliance

### HIPAA Compliance Features
- Audit logging for all patient data access
- User authentication verification
- Data access tracking and reporting
- Secure log storage with integrity verification

### Security Monitoring
- Suspicious request pattern detection
- Rate limiting and abuse prevention
- Authentication failure tracking
- SQL injection and XSS attempt detection

### Data Protection
- Sensitive data redaction in logs
- Encrypted log storage
- Access control for monitoring data
- Audit trail for configuration changes

## Performance Optimization

### Monitoring Overhead
- Asynchronous logging to minimize request impact
- Batch processing for database writes
- Memory-efficient data structures
- Configurable sampling rates

### Database Optimization
- Proper indexing on timestamp and category columns
- Automated cleanup and archiving
- Partitioning for large tables
- Query optimization for dashboard views

### Caching Strategy
- In-memory caching for frequently accessed metrics
- Redis integration for distributed caching
- Cache invalidation strategies
- Performance metric aggregation

## Troubleshooting

### Common Issues

#### High Memory Usage
```javascript
// Check memory usage patterns
const highMemoryOps = performanceMonitor.getHighMemoryOperations(50 * 1024 * 1024, 10);
console.log('High memory operations:', highMemoryOps);
```

#### Slow Database Queries
```javascript
// Identify slow operations
const slowOps = performanceMonitor.getSlowOperations(1000, 10);
console.log('Slow operations:', slowOps);
```

#### Error Rate Spikes
```javascript
// Get error statistics
const errorStats = await errorTracker.getErrorStatistics({
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
});
console.log('Error statistics:', errorStats);
```

### Debugging Tools
- Performance profiling endpoints
- Error pattern analysis
- Audit log search and filtering
- System health diagnostics

## Maintenance

### Daily Tasks
- Review error alerts and patterns
- Check system health scores
- Monitor performance trends
- Verify audit log integrity

### Weekly Tasks
- Analyze performance reports
- Review security alerts
- Update alert thresholds if needed
- Check disk space and cleanup logs

### Monthly Tasks
- Archive old monitoring data
- Review and update configuration
- Performance optimization analysis
- Compliance reporting

### Automated Maintenance
```sql
-- Daily cleanup (automated via events)
CALL CleanupMonitoringData(30);

-- Weekly archival
CALL ArchiveOldData(90);
```

## Best Practices

### Performance Monitoring
1. Set realistic performance thresholds
2. Monitor trends, not just absolute values
3. Use sampling for high-volume operations
4. Focus on user-impacting metrics

### Error Tracking
1. Categorize errors appropriately
2. Include sufficient context for debugging
3. Avoid logging sensitive information
4. Set up proper alert thresholds

### Audit Logging
1. Log all sensitive operations
2. Include user context and timestamps
3. Ensure log integrity and tamper-evidence
4. Regular compliance reporting

### Security Monitoring
1. Monitor for suspicious patterns
2. Implement rate limiting
3. Track authentication failures
4. Regular security audits

## Integration Examples

### Express.js Integration
```javascript
const express = require('express');
const { performanceMiddleware, auditMiddleware } = require('./middleware/monitoring');

const app = express();

// Global monitoring
app.use(performanceMiddleware);

// Route-specific monitoring
app.use('/api/v1/patients', auditMiddleware({
  category: 'DATA_ACCESS',
  resource: 'patient_data',
  sensitiveFields: ['ssn', 'dob'],
  logResponse: true
}));
```

### Service Layer Integration
```javascript
class RCMService {
  async processPayment(paymentData) {
    const operationId = performanceMonitor.startOperation('payment_processing', 'service', {
      amount: paymentData.amount,
      method: paymentData.method
    });

    try {
      const result = await this.executePayment(paymentData);
      
      performanceMonitor.endOperation(operationId, { success: true });
      
      await auditLogger.logFinancialOperation(paymentData.userId, 'payment_processed', {
        amount: paymentData.amount,
        transactionId: result.transactionId
      });
      
      return result;
    } catch (error) {
      performanceMonitor.endOperation(operationId, { success: false, error: error.message });
      
      await errorTracker.trackError(error, {
        component: 'RCMService',
        operation: 'processPayment',
        userId: paymentData.userId
      });
      
      throw error;
    }
  }
}
```

## Conclusion

The RCM monitoring and logging system provides comprehensive visibility into system performance, errors, and user activities. It ensures compliance with healthcare regulations while providing the tools needed to maintain a high-performance, secure application.

Key benefits:
- **Proactive Issue Detection**: Early warning system for performance and errors
- **Compliance Assurance**: Comprehensive audit trails for regulatory requirements
- **Security Monitoring**: Real-time detection of suspicious activities
- **Performance Optimization**: Data-driven insights for system improvements
- **Operational Excellence**: Automated monitoring and alerting for 24/7 operations