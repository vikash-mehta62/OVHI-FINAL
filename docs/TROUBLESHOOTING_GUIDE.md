# RCM Module Troubleshooting Guide

This comprehensive guide helps developers and system administrators diagnose and resolve common issues in the RCM (Revenue Cycle Management) module.

## Table of Contents

1. [Quick Diagnostic Tools](#quick-diagnostic-tools)
2. [Application Issues](#application-issues)
3. [Database Issues](#database-issues)
4. [Performance Issues](#performance-issues)
5. [Security Issues](#security-issues)
6. [Integration Issues](#integration-issues)
7. [Deployment Issues](#deployment-issues)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Emergency Procedures](#emergency-procedures)

## Quick Diagnostic Tools

### Health Check Commands

```bash
# Application health check
curl -f http://localhost:3000/api/v1/monitoring/health

# Database connectivity check
curl -f http://localhost:3000/api/v1/monitoring/db-health

# Redis connectivity check
curl -f http://localhost:3000/api/v1/monitoring/redis-health

# External services check
curl -f http://localhost:3000/api/v1/monitoring/services-health

# Complete system status
./scripts/system-status.sh
```

### Log Analysis Commands

```bash
# View recent application logs
docker logs rcm-app --tail=100 -f

# Search for errors in logs
grep -i "error\|exception\|failed" /var/log/rcm/application.log | tail -20

# Check database slow queries
mysql -e "SELECT * FROM information_schema.processlist WHERE time > 10;"

# Monitor real-time performance
htop -p $(pgrep node)
```

### System Information

```bash
# Check system resources
df -h                    # Disk usage
free -h                  # Memory usage
top -bn1 | head -20     # CPU and process info
netstat -tlnp           # Network connections

# Docker container status
docker ps -a
docker stats --no-stream

# Database status
systemctl status mysql   # If using system MySQL
docker exec rcm-db mysqladmin status
```

## Application Issues

### Issue: Application Won't Start

#### Symptoms
- Container exits immediately
- "Connection refused" errors
- Port binding failures

#### Diagnostic Steps
```bash
# Check container logs
docker logs rcm-app

# Verify environment variables
docker exec rcm-app env | grep -E "(NODE_ENV|PORT|DB_|REDIS_)"

# Check port availability
netstat -tlnp | grep :3000

# Verify file permissions
docker exec rcm-app ls -la /app
```

#### Common Causes and Solutions

**1. Missing Environment Variables**
```bash
# Check if .env file exists and has correct values
cat .env | grep -E "(DB_|REDIS_|JWT_)"

# Solution: Copy and configure environment file
cp .env.production.example .env.production
# Edit with correct values
```

**2. Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000

# Solution: Kill the process or use different port
kill -9 <PID>
# Or change PORT in environment variables
```

**3. Database Connection Issues**
```bash
# Test database connectivity
docker exec rcm-app node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
}).then(() => console.log('DB Connected')).catch(console.error);
"

# Solution: Verify database is running and credentials are correct
docker ps | grep mysql
docker logs rcm-db
```

### Issue: Application Crashes Randomly

#### Symptoms
- Intermittent 502/503 errors
- Container restarts frequently
- Memory or CPU spikes

#### Diagnostic Steps
```bash
# Check container restart count
docker ps -a | grep rcm-app

# Monitor resource usage
docker stats rcm-app

# Check for memory leaks
docker exec rcm-app node -e "console.log(process.memoryUsage())"

# Review crash logs
docker logs rcm-app | grep -i "crash\|killed\|exit"
```

#### Solutions

**1. Memory Issues**
```bash
# Increase container memory limit
# In docker-compose.yml:
services:
  rcm-app:
    deploy:
      resources:
        limits:
          memory: 2G  # Increase from 1G
```

**2. Unhandled Promise Rejections**
```javascript
// Add to application startup
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
```

### Issue: Slow API Response Times

#### Symptoms
- API responses taking > 2 seconds
- Timeout errors
- High CPU usage

#### Diagnostic Steps
```bash
# Check API response times
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3000/api/v1/rcm/dashboard

# Monitor database queries
mysql -e "SHOW PROCESSLIST;"

# Check slow query log
mysql -e "SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;"

# Profile Node.js application
docker exec rcm-app node --prof app.js
```

#### Solutions

**1. Database Query Optimization**
```sql
-- Add missing indexes
CREATE INDEX idx_claim_status_date ON claim(status, created_at);
CREATE INDEX idx_payment_claim_date ON payment(claim_id, created_at);

-- Optimize slow queries
EXPLAIN SELECT * FROM claim WHERE status = 'pending' ORDER BY created_at DESC;
```

**2. Implement Caching**
```javascript
// Add Redis caching for frequently accessed data
const redis = require('redis');
const client = redis.createClient();

const getCachedDashboardData = async (userId) => {
  const cacheKey = `dashboard:${userId}`;
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await getDashboardDataFromDB(userId);
  await client.setex(cacheKey, 300, JSON.stringify(data)); // Cache for 5 minutes
  return data;
};
```

## Database Issues

### Issue: Database Connection Pool Exhausted

#### Symptoms
- "Too many connections" errors
- Long wait times for database operations
- Connection timeout errors

#### Diagnostic Steps
```bash
# Check current connections
mysql -e "SHOW STATUS LIKE 'Threads_connected';"
mysql -e "SHOW STATUS LIKE 'Max_used_connections';"

# Check connection pool configuration
docker exec rcm-app node -e "console.log(require('./config/database').pool)"

# Monitor connection usage
watch -n 1 'mysql -e "SHOW PROCESSLIST;" | wc -l'
```

#### Solutions

**1. Increase Connection Pool Size**
```javascript
// In database configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 20,        // Increase from 10
  acquireTimeout: 60000,      // 60 seconds
  timeout: 60000,
  reconnect: true
});
```

**2. Fix Connection Leaks**
```javascript
// Ensure connections are properly released
const executeQuery = async (query, params) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute(query, params);
    return results;
  } finally {
    if (connection) connection.release(); // Always release
  }
};
```

### Issue: Database Deadlocks

#### Symptoms
- "Deadlock found when trying to get lock" errors
- Transaction rollbacks
- Inconsistent data states

#### Diagnostic Steps
```bash
# Check for deadlocks
mysql -e "SHOW ENGINE INNODB STATUS;" | grep -A 20 "LATEST DETECTED DEADLOCK"

# Monitor lock waits
mysql -e "SELECT * FROM information_schema.INNODB_LOCKS;"

# Check transaction isolation level
mysql -e "SELECT @@transaction_isolation;"
```

#### Solutions

**1. Implement Proper Transaction Ordering**
```javascript
// Always acquire locks in the same order
const transferPayment = async (fromClaimId, toClaimId, amount) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Always lock claims in ID order to prevent deadlocks
    const [claim1Id, claim2Id] = [fromClaimId, toClaimId].sort();
    
    await connection.execute('SELECT * FROM claim WHERE id = ? FOR UPDATE', [claim1Id]);
    await connection.execute('SELECT * FROM claim WHERE id = ? FOR UPDATE', [claim2Id]);
    
    // Perform the transfer
    await connection.execute('UPDATE claim SET amount = amount - ? WHERE id = ?', [amount, fromClaimId]);
    await connection.execute('UPDATE claim SET amount = amount + ? WHERE id = ?', [amount, toClaimId]);
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
```

**2. Reduce Transaction Scope**
```javascript
// Keep transactions short and focused
const updateClaimStatus = async (claimId, status) => {
  // Do preparation work outside transaction
  const validationResult = await validateStatusChange(claimId, status);
  
  if (!validationResult.valid) {
    throw new Error(validationResult.error);
  }
  
  // Short transaction for the actual update
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE claim SET status = ? WHERE id = ?', [status, claimId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
```

## Performance Issues

### Issue: High Memory Usage

#### Symptoms
- Container memory usage > 80%
- Out of memory errors
- Slow garbage collection

#### Diagnostic Steps
```bash
# Monitor memory usage
docker stats rcm-app

# Check Node.js memory usage
docker exec rcm-app node -e "
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('RSS:', Math.round(usage.rss / 1024 / 1024), 'MB');
  console.log('Heap Used:', Math.round(usage.heapUsed / 1024 / 1024), 'MB');
  console.log('Heap Total:', Math.round(usage.heapTotal / 1024 / 1024), 'MB');
  console.log('---');
}, 5000);
"

# Profile memory usage
docker exec rcm-app node --inspect=0.0.0.0:9229 app.js
# Then use Chrome DevTools to connect and profile
```

#### Solutions

**1. Optimize Large Data Processing**
```javascript
// Use streams for large datasets
const processLargeClaims = async () => {
  const stream = mysql.createReadStream('SELECT * FROM claim WHERE amount > 10000');
  
  stream.on('data', (claim) => {
    // Process one claim at a time
    processClaim(claim);
  });
  
  stream.on('end', () => {
    console.log('Finished processing all claims');
  });
};

// Instead of loading all data into memory
const getAllClaims = async () => {
  const claims = await db.execute('SELECT * FROM claim'); // Loads everything
  return claims.map(processClaim); // High memory usage
};
```

**2. Implement Pagination**
```javascript
// Paginate large result sets
const getClaimsPaginated = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  const [claims] = await db.execute(
    'SELECT * FROM claim ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  
  const [countResult] = await db.execute('SELECT COUNT(*) as total FROM claim');
  const total = countResult[0].total;
  
  return {
    claims,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
```

### Issue: High CPU Usage

#### Symptoms
- CPU usage consistently > 80%
- Slow response times
- High load average

#### Diagnostic Steps
```bash
# Monitor CPU usage
top -p $(pgrep node)

# Profile CPU usage
docker exec rcm-app node --prof app.js
# Generate profile report
node --prof-process isolate-*.log > profile.txt

# Check for CPU-intensive operations
docker exec rcm-app node -e "
console.time('test');
// Run suspected CPU-intensive operation
console.timeEnd('test');
"
```

#### Solutions

**1. Optimize Expensive Operations**
```javascript
// Use efficient algorithms
const calculateTotalRevenue = (claims) => {
  // Inefficient: Multiple array iterations
  // const total = claims.filter(c => c.status === 'paid')
  //                    .map(c => c.amount)
  //                    .reduce((sum, amount) => sum + amount, 0);
  
  // Efficient: Single iteration
  return claims.reduce((total, claim) => {
    return claim.status === 'paid' ? total + claim.amount : total;
  }, 0);
};
```

**2. Implement Caching for Expensive Calculations**
```javascript
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

const expensiveCalculation = memoize((data) => {
  // CPU-intensive calculation
  return data.reduce((result, item) => {
    // Complex processing
    return result + complexProcessing(item);
  }, 0);
});
```

## Security Issues

### Issue: Authentication Failures

#### Symptoms
- Users unable to log in
- "Invalid token" errors
- Frequent session timeouts

#### Diagnostic Steps
```bash
# Check JWT secret configuration
docker exec rcm-app node -e "console.log('JWT Secret length:', process.env.JWT_SECRET?.length)"

# Verify token generation
docker exec rcm-app node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({userId: 'test'}, process.env.JWT_SECRET, {expiresIn: '1h'});
console.log('Token generated:', !!token);
console.log('Token length:', token.length);
"

# Check authentication middleware
grep -n "authentication\|jwt\|token" server/middleware/auth.js
```

#### Solutions

**1. Fix JWT Configuration**
```javascript
// Ensure JWT secret is properly configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

// Proper token generation
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { 
      expiresIn: '1h',
      issuer: 'rcm-app',
      audience: 'rcm-users'
    }
  );
};
```

**2. Implement Token Refresh**
```javascript
// Add refresh token mechanism
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};
```

### Issue: SQL Injection Vulnerabilities

#### Symptoms
- Suspicious database queries in logs
- Unexpected data modifications
- Security scanner alerts

#### Diagnostic Steps
```bash
# Check for unsafe query patterns
grep -r "SELECT.*\${" server/
grep -r "INSERT.*\${" server/
grep -r "UPDATE.*\${" server/

# Review database logs for suspicious queries
tail -f /var/log/mysql/mysql.log | grep -i "union\|drop\|delete"

# Run security scan
npm audit
npx snyk test
```

#### Solutions

**1. Use Parameterized Queries**
```javascript
// Vulnerable code
const getUserByEmail = async (email) => {
  const query = `SELECT * FROM user WHERE email = '${email}'`; // VULNERABLE
  return await db.query(query);
};

// Secure code
const getUserByEmail = async (email) => {
  const query = 'SELECT * FROM user WHERE email = ?';
  const [rows] = await db.execute(query, [email]); // SECURE
  return rows[0];
};
```

**2. Input Validation and Sanitization**
```javascript
const Joi = require('joi');

const validateClaimData = (data) => {
  const schema = Joi.object({
    patientName: Joi.string().min(2).max(100).pattern(/^[a-zA-Z\s]+$/).required(),
    amount: Joi.number().positive().max(100000).required(),
    description: Joi.string().max(500).required(),
    serviceDate: Joi.date().max('now').required()
  });
  
  const { error, value } = schema.validate(data);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }
  return value;
};
```

## Integration Issues

### Issue: Payment Gateway Failures

#### Symptoms
- Payment processing errors
- Webhook delivery failures
- Transaction status inconsistencies

#### Diagnostic Steps
```bash
# Check payment gateway configuration
docker exec rcm-app node -e "
console.log('Stripe Key:', process.env.STRIPE_SECRET_KEY?.substring(0, 10) + '...');
console.log('Webhook Secret:', !!process.env.STRIPE_WEBHOOK_SECRET);
"

# Test payment gateway connectivity
curl -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
     https://api.stripe.com/v1/charges

# Check webhook logs
grep -i "webhook\|stripe" /var/log/rcm/application.log | tail -20
```

#### Solutions

**1. Implement Retry Logic**
```javascript
const processPayment = async (paymentData, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await stripe.charges.create(paymentData);
      return result;
    } catch (error) {
      console.error(`Payment attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};
```

**2. Webhook Verification**
```javascript
const verifyWebhook = (payload, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    throw new Error('Invalid webhook signature');
  }
};
```

### Issue: Email Service Failures

#### Symptoms
- Emails not being sent
- SMTP connection errors
- Email delivery delays

#### Diagnostic Steps
```bash
# Test SMTP configuration
docker exec rcm-app node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transporter.verify().then(console.log).catch(console.error);
"

# Check email queue
redis-cli LLEN email_queue

# Review email logs
grep -i "email\|smtp" /var/log/rcm/application.log | tail -20
```

#### Solutions

**1. Implement Email Queue**
```javascript
const Queue = require('bull');
const emailQueue = new Queue('email processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// Add email to queue
const sendEmail = async (emailData) => {
  await emailQueue.add('send-email', emailData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
};

// Process email queue
emailQueue.process('send-email', async (job) => {
  const { to, subject, html } = job.data;
  await transporter.sendMail({ to, subject, html });
});
```

## Deployment Issues

### Issue: Container Build Failures

#### Symptoms
- Docker build process fails
- Missing dependencies
- Build timeouts

#### Diagnostic Steps
```bash
# Build with verbose output
docker build --no-cache --progress=plain -t rcm-app .

# Check Dockerfile syntax
docker run --rm -i hadolint/hadolint < Dockerfile

# Verify base image
docker pull node:18-alpine
```

#### Solutions

**1. Optimize Dockerfile**
```dockerfile
# Use specific version tags
FROM node:18.17-alpine

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Use non-root user
USER node
```

**2. Fix Dependency Issues**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for conflicting dependencies
npm ls
```

### Issue: Service Discovery Problems

#### Symptoms
- Services can't communicate
- DNS resolution failures
- Connection refused errors

#### Diagnostic Steps
```bash
# Test service connectivity
docker exec rcm-app ping rcm-db
docker exec rcm-app nslookup rcm-db

# Check Docker network
docker network ls
docker network inspect rcm-network

# Verify service names in docker-compose
docker-compose ps
```

#### Solutions

**1. Fix Network Configuration**
```yaml
# docker-compose.yml
version: '3.8'
services:
  rcm-app:
    networks:
      - rcm-network
  rcm-db:
    networks:
      - rcm-network

networks:
  rcm-network:
    driver: bridge
```

**2. Use Proper Service Names**
```javascript
// Use service name from docker-compose.yml
const dbConfig = {
  host: 'rcm-db', // Not 'localhost'
  port: 3306,
  // ... other config
};
```

## Monitoring and Logging

### Issue: Missing or Incomplete Logs

#### Symptoms
- No application logs
- Missing error details
- Log rotation issues

#### Diagnostic Steps
```bash
# Check log file permissions
ls -la /var/log/rcm/

# Verify log configuration
cat server/config/logger.js

# Check Docker logging driver
docker inspect rcm-app | grep LogConfig

# Test logging
docker exec rcm-app node -e "console.log('Test log message')"
```

#### Solutions

**1. Configure Proper Logging**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: '/var/log/rcm/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '/var/log/rcm/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

**2. Set Up Log Rotation**
```bash
# /etc/logrotate.d/rcm
/var/log/rcm/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker kill -s USR1 rcm-app
    endscript
}
```

## Emergency Procedures

### Critical System Failure

#### Immediate Response (0-5 minutes)
1. **Assess the situation**
   ```bash
   # Quick system check
   ./scripts/emergency-status.sh
   
   # Check if it's partial or complete failure
   curl -f http://localhost:3000/health
   ```

2. **Notify stakeholders**
   ```bash
   # Send alert to team
   ./scripts/send-alert.sh "RCM System Critical Failure"
   ```

3. **Implement immediate mitigation**
   ```bash
   # Switch to maintenance mode
   ./scripts/maintenance-mode.sh enable
   
   # Or rollback to last known good version
   ./scripts/deploy.sh production rollback
   ```

#### Investigation Phase (5-30 minutes)
1. **Gather diagnostic information**
   ```bash
   # Collect logs
   ./scripts/collect-logs.sh emergency
   
   # System snapshot
   ./scripts/system-snapshot.sh
   ```

2. **Identify root cause**
   ```bash
   # Check recent changes
   git log --oneline -10
   
   # Review deployment logs
   ./scripts/deployment-history.sh
   ```

#### Recovery Phase (30+ minutes)
1. **Implement fix**
   ```bash
   # Apply hotfix
   ./scripts/hotfix-deploy.sh
   
   # Or restore from backup
   ./scripts/restore-system.sh latest
   ```

2. **Verify recovery**
   ```bash
   # Run health checks
   ./scripts/health-check.sh comprehensive
   
   # Test critical functionality
   ./scripts/smoke-test.sh production
   ```

3. **Disable maintenance mode**
   ```bash
   ./scripts/maintenance-mode.sh disable
   ```

### Data Corruption Recovery

#### Immediate Steps
```bash
# Stop application to prevent further corruption
docker stop rcm-app

# Create emergency backup of current state
./scripts/emergency-backup.sh corrupted-state

# Restore from last known good backup
./scripts/restore-database.sh production backup-20240115-120000
```

#### Verification Steps
```bash
# Verify data integrity
./scripts/verify-data-integrity.sh

# Check for missing data
./scripts/data-consistency-check.sh

# Test application functionality
./scripts/functional-test.sh
```

## Conclusion

This troubleshooting guide provides:

- **Quick diagnostic tools** for rapid issue identification
- **Systematic approaches** to common problems
- **Step-by-step solutions** with code examples
- **Emergency procedures** for critical situations
- **Prevention strategies** to avoid future issues

Remember to:
- Always backup before making changes
- Document issues and solutions for future reference
- Update monitoring to catch similar issues early
- Review and improve procedures based on incidents

For issues not covered in this guide, escalate to the development team with:
- Detailed error messages
- Steps to reproduce
- System logs and diagnostic output
- Impact assessment and urgency level