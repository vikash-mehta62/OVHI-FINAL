/**
 * Security Configuration for RCM Module
 * Central configuration for all security settings
 */

const crypto = require('crypto');

/**
 * Security Configuration Object
 */
const SecurityConfig = {
  // Environment settings
  environment: process.env.NODE_ENV || 'development',
  
  // Authentication settings
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 3,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 8 * 60 * 60 * 1000, // 8 hours
    tokenRefreshThreshold: parseInt(process.env.TOKEN_REFRESH_THRESHOLD) || 30 * 60 * 1000, // 30 minutes
    enableIPTracking: process.env.ENABLE_IP_TRACKING === 'true',
    requireMFA: process.env.REQUIRE_MFA === 'true'
  },
  
  // Rate limiting settings
  rateLimiting: {
    enabled: process.env.ENABLE_RATE_LIMITING !== 'false',
    general: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    sensitive: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 20,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    bulk: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 5,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    reports: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 failed attempts
      skipSuccessfulRequests: true,
      skipFailedRequests: false
    }
  },
  
  // Input validation settings
  validation: {
    maxStringLength: parseInt(process.env.MAX_STRING_LENGTH) || 1000,
    maxArrayLength: parseInt(process.env.MAX_ARRAY_LENGTH) || 100,
    maxObjectDepth: parseInt(process.env.MAX_OBJECT_DEPTH) || 10,
    maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || '10mb',
    strictValidation: process.env.STRICT_VALIDATION !== 'false',
    sanitizeInputs: process.env.SANITIZE_INPUTS !== 'false'
  },
  
  // Security headers settings
  headers: {
    enabled: process.env.SECURITY_HEADERS_ENABLED !== 'false',
    hsts: {
      maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000, // 1 year
      includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
      preload: process.env.HSTS_PRELOAD === 'true'
    },
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:"],
      connectSrc: ["'self'", "https:"],
      frameAncestors: ["'none'"]
    },
    xssProtection: '1; mode=block',
    contentTypeOptions: 'nosniff',
    frameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin'
  },
  
  // Audit logging settings
  audit: {
    enabled: process.env.ENABLE_AUDIT_LOGGING !== 'false',
    logLevel: process.env.AUDIT_LOG_LEVEL || 'info',
    logSensitiveData: process.env.LOG_SENSITIVE_DATA === 'true',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS) || 90,
    logToFile: process.env.AUDIT_LOG_TO_FILE === 'true',
    logToDatabase: process.env.AUDIT_LOG_TO_DATABASE === 'true',
    logToExternal: process.env.AUDIT_LOG_TO_EXTERNAL === 'true',
    externalLogEndpoint: process.env.EXTERNAL_LOG_ENDPOINT
  },
  
  // Encryption settings
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    key: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  },
  
  // Data protection settings
  dataProtection: {
    maskSensitiveData: process.env.MASK_SENSITIVE_DATA !== 'false',
    encryptAtRest: process.env.ENCRYPT_AT_REST === 'true',
    encryptInTransit: process.env.ENCRYPT_IN_TRANSIT !== 'false',
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 2555, // 7 years
    anonymizeAfterDays: parseInt(process.env.ANONYMIZE_AFTER_DAYS) || 1825, // 5 years
    sensitiveFields: [
      'ssn', 'social_security_number', 'tax_id',
      'account_number', 'routing_number', 'credit_card',
      'password', 'secret', 'private_key', 'api_key'
    ]
  },
  
  // Session management settings
  session: {
    secure: process.env.SESSION_SECURE !== 'false',
    httpOnly: process.env.SESSION_HTTP_ONLY !== 'false',
    sameSite: process.env.SESSION_SAME_SITE || 'strict',
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 8 * 60 * 60 * 1000, // 8 hours
    rolling: process.env.SESSION_ROLLING === 'true',
    regenerateOnAuth: process.env.SESSION_REGENERATE_ON_AUTH !== 'false'
  },
  
  // CORS settings
  cors: {
    enabled: process.env.ENABLE_CORS !== 'false',
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: parseInt(process.env.CORS_MAX_AGE) || 86400 // 24 hours
  },
  
  // File upload security
  fileUpload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '10mb',
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    scanForMalware: process.env.SCAN_FOR_MALWARE === 'true',
    quarantinePath: process.env.QUARANTINE_PATH || './quarantine',
    uploadPath: process.env.UPLOAD_PATH || './uploads'
  },
  
  // Database security
  database: {
    useSSL: process.env.DB_USE_SSL === 'true',
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
    enableQueryLogging: process.env.DB_ENABLE_QUERY_LOGGING === 'true',
    logSlowQueries: process.env.DB_LOG_SLOW_QUERIES === 'true',
    slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD) || 1000 // 1 second
  },
  
  // Monitoring and alerting
  monitoring: {
    enabled: process.env.ENABLE_MONITORING !== 'false',
    metricsEndpoint: process.env.METRICS_ENDPOINT || '/metrics',
    healthCheckEndpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
    alertingEnabled: process.env.ENABLE_ALERTING === 'true',
    alertWebhook: process.env.ALERT_WEBHOOK,
    performanceThresholds: {
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 1000, // 1 second
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 0.05, // 5%
      cpuUsage: parseFloat(process.env.CPU_USAGE_THRESHOLD) || 0.8, // 80%
      memoryUsage: parseFloat(process.env.MEMORY_USAGE_THRESHOLD) || 0.8 // 80%
    }
  },
  
  // Compliance settings
  compliance: {
    hipaaCompliant: process.env.HIPAA_COMPLIANT === 'true',
    pciCompliant: process.env.PCI_COMPLIANT === 'true',
    gdprCompliant: process.env.GDPR_COMPLIANT === 'true',
    soc2Compliant: process.env.SOC2_COMPLIANT === 'true',
    auditTrailRequired: process.env.AUDIT_TRAIL_REQUIRED !== 'false',
    dataMinimization: process.env.DATA_MINIMIZATION === 'true',
    rightToErasure: process.env.RIGHT_TO_ERASURE === 'true'
  }
};

/**
 * Validate security configuration
 */
const validateSecurityConfig = () => {
  const errors = [];
  
  // Check JWT secret strength
  if (SecurityConfig.auth.jwtSecret === 'fallback-secret-change-in-production') {
    errors.push('JWT_SECRET must be set in production');
  }
  
  if (SecurityConfig.auth.jwtSecret.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long');
  }
  
  // Check encryption key
  if (!SecurityConfig.encryption.key || SecurityConfig.encryption.key.length < 64) {
    errors.push('ENCRYPTION_KEY must be set and at least 32 bytes (64 hex characters)');
  }
  
  // Check HTTPS in production
  if (SecurityConfig.environment === 'production' && !process.env.HTTPS_ENABLED) {
    errors.push('HTTPS should be enabled in production');
  }
  
  // Check audit logging in production
  if (SecurityConfig.environment === 'production' && !SecurityConfig.audit.enabled) {
    errors.push('Audit logging should be enabled in production');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get security configuration for specific environment
 */
const getSecurityConfig = (environment = null) => {
  const env = environment || SecurityConfig.environment;
  
  // Environment-specific overrides
  const envConfig = { ...SecurityConfig };
  
  if (env === 'production') {
    // Production-specific security settings
    envConfig.headers.csp.scriptSrc = ["'self'"]; // Remove unsafe-inline
    envConfig.headers.csp.styleSrc = ["'self'"]; // Remove unsafe-inline
    envConfig.audit.logSensitiveData = false; // Don't log sensitive data in production
    envConfig.validation.strictValidation = true; // Enforce strict validation
  } else if (env === 'development') {
    // Development-specific settings
    envConfig.rateLimiting.enabled = false; // Disable rate limiting in dev
    envConfig.audit.logSensitiveData = true; // Allow sensitive data logging in dev
  }
  
  return envConfig;
};

/**
 * Generate security report
 */
const generateSecurityReport = () => {
  const validation = validateSecurityConfig();
  const config = getSecurityConfig();
  
  return {
    timestamp: new Date().toISOString(),
    environment: config.environment,
    validation: validation,
    securityFeatures: {
      authentication: config.auth.jwtSecret !== 'fallback-secret-change-in-production',
      rateLimiting: config.rateLimiting.enabled,
      securityHeaders: config.headers.enabled,
      auditLogging: config.audit.enabled,
      inputValidation: config.validation.strictValidation,
      dataEncryption: config.encryption.key.length >= 64,
      sessionSecurity: config.session.secure && config.session.httpOnly,
      corsProtection: config.cors.enabled
    },
    complianceStatus: {
      hipaa: config.compliance.hipaaCompliant,
      pci: config.compliance.pciCompliant,
      gdpr: config.compliance.gdprCompliant,
      soc2: config.compliance.soc2Compliant
    },
    recommendations: validation.errors
  };
};

module.exports = {
  SecurityConfig,
  validateSecurityConfig,
  getSecurityConfig,
  generateSecurityReport
};