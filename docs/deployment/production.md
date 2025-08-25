# Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the RCM System to production environments, including infrastructure setup, security configuration, and monitoring implementation.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Security Configuration](#security-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Load Balancing](#load-balancing)
10. [Backup & Recovery](#backup--recovery)

## Prerequisites

### System Requirements

#### Minimum Hardware Requirements
```
CPU: 4 cores (8 recommended)
RAM: 8GB (16GB recommended)
Storage: 100GB SSD (500GB recommended)
Network: 1Gbps connection
```

#### Recommended Production Setup
```
Application Servers: 2x instances (load balanced)
Database Server: 1x dedicated MySQL server
Redis Cache: 1x dedicated Redis server
Load Balancer: 1x NGINX or HAProxy
File Storage: AWS S3 or equivalent
```

#### Software Requirements
```
Operating System: Ubuntu 20.04 LTS or CentOS 8
Node.js: 18.x LTS
MySQL: 8.0+
Redis: 6.x+
NGINX: 1.18+
PM2: 5.x+ (Process Manager)
```

### Network Requirements
```
Ports:
- 80 (HTTP - redirect to HTTPS)
- 443 (HTTPS)
- 3306 (MySQL - internal only)
- 6379 (Redis - internal only)
- 22 (SSH - restricted access)

Firewall Rules:
- Allow 80/443 from anywhere
- Allow 22 from management IPs only
- Allow 3306/6379 from app servers only
- Block all other inbound traffic
```

## Infrastructure Setup

### Server Provisioning

#### Application Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install build tools
sudo apt-get install -y build-essential python3-dev

# Create application user
sudo useradd -m -s /bin/bash rcmapp
sudo usermod -aG sudo rcmapp

# Create application directory
sudo mkdir -p /opt/rcm-system
sudo chown rcmapp:rcmapp /opt/rcm-system
```

#### Database Server Setup
```bash
# Install MySQL 8.0
sudo apt update
sudo apt install -y mysql-server-8.0

# Secure MySQL installation
sudo mysql_secure_installation

# Configure MySQL for production
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

#### MySQL Production Configuration
```ini
[mysqld]
# Basic Settings
user = mysql
pid-file = /var/run/mysqld/mysqld.pid
socket = /var/run/mysqld/mysqld.sock
port = 3306
basedir = /usr
datadir = /var/lib/mysql
tmpdir = /tmp
lc-messages-dir = /usr/share/mysql

# Network Settings
bind-address = 0.0.0.0  # Change to specific IP in production
max_connections = 200
max_connect_errors = 1000000

# InnoDB Settings
innodb_buffer_pool_size = 4G  # 70-80% of available RAM
innodb_log_file_size = 512M
innodb_log_buffer_size = 64M
innodb_flush_log_at_trx_commit = 1
innodb_file_per_table = 1
innodb_flush_method = O_DIRECT

# Query Cache
query_cache_type = 1
query_cache_size = 256M
query_cache_limit = 2M

# Logging
log_error = /var/log/mysql/error.log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Security
local_infile = 0
skip_show_database
```

#### Redis Server Setup
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf
```

#### Redis Production Configuration
```ini
# Network
bind 127.0.0.1 10.0.1.100  # Add private IP
port 6379
protected-mode yes

# Security
requirepass your_secure_redis_password

# Memory Management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-keepalive 300
timeout 0
```

## Environment Configuration

### Production Environment Variables

#### Backend Configuration (.env)
```bash
# Application
NODE_ENV=production
PORT=8000
APP_NAME="RCM System"
APP_VERSION="1.0.0"

# Database
DB_HOST=10.0.1.101
DB_PORT=3306
DB_NAME=rcm_system
DB_USER=rcm_user
DB_PASSWORD=secure_database_password
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=20

# Redis
REDIS_HOST=10.0.1.102
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key_here
HASH_ROUNDS=12

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=rcm-system-files-prod
AWS_S3_ENDPOINT=https://s3.amazonaws.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_email_app_password

# External APIs
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
CLEARINGHOUSE_API_URL=https://api.clearinghouse.com
CLEARINGHOUSE_API_KEY=your_clearinghouse_api_key

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
SESSION_SECRET=your_session_secret_key

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
NEW_RELIC_LICENSE_KEY=your_new_relic_license_key
```

#### Frontend Configuration (.env.production)
```bash
# API Configuration
REACT_APP_API_URL=https://api.yourdomain.com/api/v1
REACT_APP_WS_URL=wss://api.yourdomain.com

# Authentication
REACT_APP_JWT_STORAGE_KEY=rcm_token
REACT_APP_REFRESH_STORAGE_KEY=rcm_refresh_token

# External Services
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
REACT_APP_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_REAL_TIME=true
REACT_APP_ENABLE_NOTIFICATIONS=true

# Application
REACT_APP_VERSION=1.0.0
REACT_APP_BUILD_ID=prod-20240115-001
REACT_APP_ENVIRONMENT=production
```

## Database Setup

### Database Creation and User Setup
```sql
-- Connect as root
mysql -u root -p

-- Create database
CREATE DATABASE rcm_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER 'rcm_user'@'%' IDENTIFIED BY 'secure_database_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON rcm_system.* TO 'rcm_user'@'%';

-- Create backup user
CREATE USER 'rcm_backup'@'localhost' IDENTIFIED BY 'secure_backup_password';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON rcm_system.* TO 'rcm_backup'@'localhost';

-- Create monitoring user
CREATE USER 'rcm_monitor'@'%' IDENTIFIED BY 'secure_monitor_password';
GRANT SELECT ON performance_schema.* TO 'rcm_monitor'@'%';
GRANT SELECT ON information_schema.* TO 'rcm_monitor'@'%';

FLUSH PRIVILEGES;
```

### Database Migration and Seeding
```bash
# Navigate to server directory
cd /opt/rcm-system/server

# Install dependencies
npm ci --only=production

# Run database migrations
NODE_ENV=production npm run migrate

# Seed initial data (if needed)
NODE_ENV=production npm run seed:production

# Verify database setup
NODE_ENV=production npm run db:verify
```

## Application Deployment

### Code Deployment Process

#### 1. Prepare Deployment Package
```bash
# On development machine
git clone https://github.com/your-org/rcm-system.git
cd rcm-system

# Install dependencies and build
npm ci
npm run build

# Create deployment package
tar -czf rcm-system-v1.0.0.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=*.log \
    .
```

#### 2. Deploy to Production Server
```bash
# On production server
cd /opt/rcm-system

# Backup current version
sudo -u rcmapp cp -r current backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

# Extract new version
sudo -u rcmapp tar -xzf rcm-system-v1.0.0.tar.gz -C /tmp/
sudo -u rcmapp cp -r /tmp/rcm-system current/

# Set permissions
sudo chown -R rcmapp:rcmapp /opt/rcm-system/current
sudo chmod -R 755 /opt/rcm-system/current
```

#### 3. Install Dependencies
```bash
# Backend dependencies
cd /opt/rcm-system/current/server
sudo -u rcmapp npm ci --only=production

# Frontend build (if not pre-built)
cd /opt/rcm-system/current
sudo -u rcmapp npm ci --only=production
sudo -u rcmapp npm run build
```

### PM2 Process Management

#### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [
    {
      name: 'rcm-backend',
      script: './server/app.js',
      cwd: '/opt/rcm-system/current',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      error_file: '/var/log/rcm/backend-error.log',
      out_file: '/var/log/rcm/backend-out.log',
      log_file: '/var/log/rcm/backend-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

#### Start Application with PM2
```bash
# Install PM2 configuration
sudo -u rcmapp pm2 start ecosystem.config.js

# Save PM2 configuration
sudo -u rcmapp pm2 save

# Setup PM2 startup script
sudo pm2 startup systemd -u rcmapp --hp /home/rcmapp
sudo systemctl enable pm2-rcmapp
```

### NGINX Configuration

#### Install and Configure NGINX
```bash
# Install NGINX
sudo apt install -y nginx

# Create NGINX configuration
sudo nano /etc/nginx/sites-available/rcm-system
```

#### NGINX Configuration File
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# Upstream backend servers
upstream rcm_backend {
    least_conn;
    server 127.0.0.1:8000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8001 max_fails=3 fail_timeout=30s backup;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security \"max-age=63072000\" always;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection \"1; mode=block\";
    add_header Referrer-Policy \"strict-origin-when-cross-origin\";
    add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:;\";
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Static file serving
    location / {
        root /opt/rcm-system/current/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
    
    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://rcm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Login rate limiting
    location /api/v1/auth/login {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://rcm_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://rcm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 \"healthy\\n\";
        add_header Content-Type text/plain;
    }
    
    # Deny access to sensitive files
    location ~ /\\. {
        deny all;
    }
    
    location ~ \\.(env|log|config)$ {
        deny all;
    }
}
```

#### Enable NGINX Configuration
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/rcm-system /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart NGINX
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Security Configuration

### SSL/TLS Certificate Setup

#### Using Let's Encrypt (Certbot)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Set up automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

#### UFW (Uncomplicated Firewall) Setup
```bash
# Reset firewall rules
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if needed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow MySQL from app servers only
sudo ufw allow from 10.0.1.100 to any port 3306
sudo ufw allow from 10.0.1.101 to any port 3306

# Allow Redis from app servers only
sudo ufw allow from 10.0.1.100 to any port 6379
sudo ufw allow from 10.0.1.101 to any port 6379

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### Application Security

#### Security Headers Configuration
```javascript
// server/middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Security middleware
const securityMiddleware = [
  // Helmet for security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [\"'self'\"],
        styleSrc: [\"'self'\", \"'unsafe-inline'\"],
        scriptSrc: [\"'self'\"],
        imgSrc: [\"'self'\", 'data:', 'https:'],
        connectSrc: [\"'self'\", 'wss:'],
        fontSrc: [\"'self'\", 'data:'],
        objectSrc: [\"'none'\"],
        mediaSrc: [\"'self'\"],
        frameSrc: [\"'none'\"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),
  
  // Rate limiting
  createRateLimit(15 * 60 * 1000, 100, 'Too many requests from this IP'),
  
  // Login rate limiting
  (req, res, next) => {
    if (req.path === '/api/v1/auth/login') {
      return createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts')(req, res, next);
    }
    next();
  }
];

module.exports = { securityMiddleware };
```

## Monitoring & Logging

### Application Logging

#### Winston Logger Configuration
```javascript
// server/utils/logger.js
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'rcm-system' },
  transports: [
    // Error log
    new winston.transports.File({
      filename: '/var/log/rcm/error.log',
      level: 'error',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Combined log
    new winston.transports.File({
      filename: '/var/log/rcm/combined.log',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Console output for development
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ]
});

module.exports = logger;
```

### System Monitoring

#### Health Check Endpoint
```javascript
// server/routes/health.js
const express = require('express');
const { sequelize } = require('../config/database');
const redis = require('../config/redis');
const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {}
  };

  try {
    // Database check
    await sequelize.authenticate();
    health.checks.database = { status: 'ok' };
  } catch (error) {
    health.checks.database = { status: 'error', message: error.message };
    health.status = 'error';
  }

  try {
    // Redis check
    await redis.ping();
    health.checks.redis = { status: 'ok' };
  } catch (error) {
    health.checks.redis = { status: 'error', message: error.message };
    health.status = 'error';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
```

#### Log Rotation Configuration
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/rcm-system

# Add configuration
/var/log/rcm/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 rcmapp rcmapp
    postrotate
        /bin/kill -USR1 $(cat /var/run/rcm/app.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
```

### Performance Monitoring

#### New Relic Integration
```javascript
// server/app.js (at the very top)
if (process.env.NODE_ENV === 'production') {
  require('newrelic');
}

// Rest of application code...
```

#### Custom Metrics Collection
```javascript
// server/middleware/metrics.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Middleware to collect metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });
  
  next();
};

module.exports = { metricsMiddleware, prometheus };
```

## Backup & Recovery

### Automated Backup Script
```bash
#!/bin/bash
# /opt/scripts/backup-rcm.sh

set -e

# Configuration
BACKUP_DIR="/backups/rcm"
DB_NAME="rcm_system"
DB_USER="rcm_backup"
DB_PASS="secure_backup_password"
S3_BUCKET="rcm-system-backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Database backup
echo \"Starting database backup...\"
mysqldump --single-transaction --routines --triggers \\
    --user=$DB_USER --password=$DB_PASS \\
    $DB_NAME > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Compress database backup
gzip $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Application files backup
echo \"Starting application files backup...\"
tar -czf $BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz \\
    --exclude='node_modules' \\
    --exclude='logs' \\
    --exclude='*.log' \\
    /opt/rcm-system/current

# Upload to S3
echo \"Uploading to S3...\"
aws s3 cp $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz s3://$S3_BUCKET/database/
aws s3 cp $BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz s3://$S3_BUCKET/application/

# Clean up local backups older than retention period
find $BACKUP_DIR -name \"*.sql.gz\" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name \"*.tar.gz\" -mtime +$RETENTION_DAYS -delete

# Clean up S3 backups older than retention period
aws s3api list-objects-v2 --bucket $S3_BUCKET --prefix database/ \\
    --query \"Contents[?LastModified<='$(date -d \"$RETENTION_DAYS days ago\" --iso-8601)'].Key\" \\
    --output text | xargs -I {} aws s3 rm s3://$S3_BUCKET/{}

echo \"Backup completed successfully\"
```

### Backup Cron Job
```bash
# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/scripts/backup-rcm.sh >> /var/log/rcm/backup.log 2>&1

# Weekly full system backup
0 3 * * 0 /opt/scripts/full-system-backup.sh >> /var/log/rcm/backup.log 2>&1
```

### Recovery Procedures

#### Database Recovery
```bash
#!/bin/bash
# Database recovery script

BACKUP_FILE=$1
DB_NAME="rcm_system"
DB_USER="root"

if [ -z \"$BACKUP_FILE\" ]; then
    echo \"Usage: $0 <backup_file.sql.gz>\"
    exit 1
fi

# Stop application
sudo systemctl stop pm2-rcmapp

# Create recovery database
mysql -u $DB_USER -p -e \"DROP DATABASE IF EXISTS ${DB_NAME}_recovery;\"
mysql -u $DB_USER -p -e \"CREATE DATABASE ${DB_NAME}_recovery CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"

# Restore from backup
gunzip -c $BACKUP_FILE | mysql -u $DB_USER -p ${DB_NAME}_recovery

# Verify recovery
mysql -u $DB_USER -p -e \"USE ${DB_NAME}_recovery; SHOW TABLES; SELECT COUNT(*) FROM claims;\"

echo \"Recovery completed. Database restored to ${DB_NAME}_recovery\"
echo \"To switch to recovered database:\"
echo \"1. Rename current database: ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_old;\"
echo \"2. Rename recovery database: ALTER DATABASE ${DB_NAME}_recovery RENAME TO $DB_NAME;\"
echo \"3. Restart application: sudo systemctl start pm2-rcmapp\"
```

## Deployment Checklist

### Pre-Deployment Checklist
- [ ] Infrastructure provisioned and configured
- [ ] SSL certificates installed and configured
- [ ] Database server set up and secured
- [ ] Redis server configured
- [ ] Firewall rules configured
- [ ] Backup systems tested
- [ ] Monitoring systems configured
- [ ] Load balancer configured (if applicable)

### Deployment Checklist
- [ ] Application code deployed
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] PM2 processes started
- [ ] NGINX configuration updated
- [ ] SSL certificates verified
- [ ] Health checks passing
- [ ] Monitoring alerts configured

### Post-Deployment Checklist
- [ ] Application functionality tested
- [ ] Performance metrics verified
- [ ] Security scan completed
- [ ] Backup procedures tested
- [ ] Documentation updated
- [ ] Team notified of deployment
- [ ] Rollback plan documented

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: April 2024  
**Document Owner**: DevOps Team