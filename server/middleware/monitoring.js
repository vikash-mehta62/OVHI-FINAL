/**
 * Monitoring Middleware for RCM System
 * Integrates performance monitoring, error tracking, and audit logging
 */

const { performanceMonitor } = require('../utils/performanceMonitor');
const { errorTracker } = require('../utils/errorTracker');
const { auditLogger } = require('../utils/auditLogger');

/**
 * Performance monitoring middleware
 * Tracks API request performance metrics
 */
const performanceMiddleware = (req, res, next) => {
  const operationId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  // Start performance monitoring
  performanceMonitor.startOperation(operationId, 'api_request', {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    ipAddress: req.ip || req.connection.remoteAddress,
    contentLength: req.get('Content-Length'),
    acceptEncoding: req.get('Accept-Encoding')
  });
  
  // Store operation ID for later use
  req.operationId = operationId;
  req.startTime = startTime;
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  const originalJson = res.json;
  
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // End performance monitoring
    performanceMonitor.endOperation(operationId, {
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.get('Content-Length'),
      success: res.statusCode < 400,
      error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null
    });
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  res.json = function(data) {
    // Track JSON response size
    const jsonString = JSON.stringify(data);
    res.set('Content-Length', Buffer.byteLength(jsonString, 'utf8'));
    
    // Call original json method
    originalJson.call(this, data);
  };
  
  next();
};

/**
 * Error tracking middleware
 * Captures and tracks application errors
 */
const errorTrackingMiddleware = (error, req, res, next) => {
  // Track the error
  errorTracker.trackError(error, {
    component: 'ExpressMiddleware',
    operation: req.route?.path || req.path,
    userId: req.user?.id,
    requestId: req.operationId,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip || req.connection.remoteAddress,
    url: req.originalUrl,
    method: req.method,
    statusCode: res.statusCode || 500,
    responseTime: req.startTime ? Date.now() - req.startTime : null,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
    headers: {
      'user-agent': req.get('User-Agent'),
      'content-type': req.get('Content-Type'),
      'accept': req.get('Accept')
    }
  });
  
  next(error);
};

/**
 * Audit logging middleware for sensitive operations
 * Logs data access and modifications
 */
const auditMiddleware = (options = {}) => {
  return async (req, res, next) => {
    const {
      category = 'DATA_ACCESS',
      resource = req.route?.path || req.path,
      sensitiveFields = [],
      logRequest = false,
      logResponse = false
    } = options;
    
    // Determine action based on HTTP method
    const actionMap = {
      'GET': 'READ',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    };
    
    const action = actionMap[req.method] || req.method.toLowerCase();
    
    // Prepare audit metadata
    const metadata = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      resourceId: req.params.id,
      resourceType: resource.split('/').pop(),
      method: req.method,
      url: req.originalUrl
    };
    
    // Add request data if configured
    if (logRequest && req.body) {
      metadata.requestData = sanitizeSensitiveData(req.body, sensitiveFields);
    }
    
    // Override res.json to capture response data
    if (logResponse) {
      const originalJson = res.json;
      res.json = function(data) {
        // Log successful operations
        if (res.statusCode < 400) {
          auditLogger.logDataAccess(
            req.user?.id || 'ANONYMOUS',
            resource,
            action,
            {
              ...metadata,
              responseData: sanitizeSensitiveData(data, sensitiveFields),
              success: true
            }
          );
        }
        
        originalJson.call(this, data);
      };
    } else {
      // Log the operation immediately for non-response logging
      await auditLogger.logDataAccess(
        req.user?.id || 'ANONYMOUS',
        resource,
        action,
        {
          ...metadata,
          success: res.statusCode < 400
        }
      );
    }
    
    next();
  };
};

/**
 * Financial operations audit middleware
 * Special logging for financial transactions
 */
const financialAuditMiddleware = (req, res, next) => {
  // Only apply to financial operations
  if (!req.originalUrl.includes('/payment') && 
      !req.originalUrl.includes('/claim') && 
      !req.originalUrl.includes('/billing')) {
    return next();
  }
  
  const originalJson = res.json;
  res.json = function(data) {
    // Log financial operations
    if (res.statusCode < 400 && req.method !== 'GET') {
      auditLogger.logFinancialOperation(
        req.user?.id || 'SYSTEM',
        `${req.method.toLowerCase()}_${req.route?.path?.split('/').pop() || 'unknown'}`,
        {
          claimId: req.body?.claimId || req.params?.claimId,
          patientId: req.body?.patientId || req.params?.patientId,
          amount: req.body?.amount,
          currency: req.body?.currency || 'USD',
          paymentMethod: req.body?.paymentMethod,
          transactionId: data?.data?.transactionId || data?.data?.id,
          success: true,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        }
      );
    }
    
    originalJson.call(this, data);
  };
  
  next();
};

/**
 * Security monitoring middleware
 * Detects and logs suspicious activities
 */
const securityMiddleware = (req, res, next) => {
  const suspiciousPatterns = [
    /(\<script\>|\<\/script\>)/i, // XSS attempts
    /(union|select|insert|delete|drop|create|alter)/i, // SQL injection attempts
    /(\.\.|\/etc\/|\/proc\/)/i, // Path traversal attempts
    /(eval\(|javascript:)/i // Code injection attempts
  ];
  
  // Check for suspicious patterns in request
  const checkSuspicious = (data) => {
    const dataString = JSON.stringify(data).toLowerCase();
    return suspiciousPatterns.some(pattern => pattern.test(dataString));
  };
  
  let suspicious = false;
  let suspiciousData = [];
  
  // Check URL
  if (suspiciousPatterns.some(pattern => pattern.test(req.originalUrl))) {
    suspicious = true;
    suspiciousData.push({ type: 'url', value: req.originalUrl });
  }
  
  // Check query parameters
  if (Object.keys(req.query).length > 0 && checkSuspicious(req.query)) {
    suspicious = true;
    suspiciousData.push({ type: 'query', value: req.query });
  }
  
  // Check request body
  if (req.body && checkSuspicious(req.body)) {
    suspicious = true;
    suspiciousData.push({ type: 'body', value: req.body });
  }
  
  // Check headers for suspicious content
  const userAgent = req.get('User-Agent') || '';
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    suspicious = true;
    suspiciousData.push({ type: 'user-agent', value: userAgent });
  }
  
  // Log suspicious activity
  if (suspicious) {
    auditLogger.logSecurityEvent('SUSPICIOUS_REQUEST', {
      userId: req.user?.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      threat: 'POTENTIAL_INJECTION',
      blocked: false, // Not blocking, just logging
      suspiciousData,
      severity: 'WARNING'
    });
  }
  
  // Rate limiting check (simple implementation)
  const clientId = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // Max requests per minute
  
  if (!req.app.locals.rateLimitStore) {
    req.app.locals.rateLimitStore = new Map();
  }
  
  const store = req.app.locals.rateLimitStore;
  const clientData = store.get(clientId) || { requests: [], blocked: false };
  
  // Clean old requests
  clientData.requests = clientData.requests.filter(time => now - time < windowMs);
  
  // Check if rate limit exceeded
  if (clientData.requests.length >= maxRequests) {
    auditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      userId: req.user?.id,
      ipAddress: clientId,
      userAgent: req.get('User-Agent'),
      requestCount: clientData.requests.length,
      timeWindow: windowMs,
      blocked: true,
      severity: 'WARNING'
    });
    
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
  
  // Add current request
  clientData.requests.push(now);
  store.set(clientId, clientData);
  
  next();
};

/**
 * Compliance monitoring middleware
 * Ensures HIPAA and other compliance requirements
 */
const complianceMiddleware = (req, res, next) => {
  // Check for HIPAA compliance requirements
  const isPatientDataAccess = req.originalUrl.includes('/patient') || 
                             req.originalUrl.includes('/medical') ||
                             req.originalUrl.includes('/health');
  
  if (isPatientDataAccess) {
    // Ensure user is authenticated for patient data access
    if (!req.user) {
      auditLogger.logComplianceEvent('UNAUTHORIZED_PATIENT_DATA_ACCESS', {
        regulation: 'HIPAA',
        requirement: 'Authentication Required',
        status: 'NON_COMPLIANT',
        ipAddress: req.ip || req.connection.remoteAddress,
        url: req.originalUrl,
        method: req.method
      });
      
      return res.status(401).json({
        success: false,
        error: 'Authentication required for patient data access'
      });
    }
    
    // Log compliant access
    auditLogger.logComplianceEvent('PATIENT_DATA_ACCESS', {
      userId: req.user.id,
      regulation: 'HIPAA',
      requirement: 'Authenticated Access',
      status: 'COMPLIANT',
      evidence: {
        userId: req.user.id,
        timestamp: new Date().toISOString(),
        resource: req.originalUrl
      }
    });
  }
  
  next();
};

/**
 * Sanitize sensitive data for logging
 * @param {Object} data - Data to sanitize
 * @param {Array} sensitiveFields - Fields to redact
 */
function sanitizeSensitiveData(data, sensitiveFields = []) {
  if (!data || typeof data !== 'object') return data;
  
  const defaultSensitiveFields = [
    'password', 'token', 'secret', 'key', 'ssn', 'social',
    'creditCard', 'bankAccount', 'routing', 'pin'
  ];
  
  const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];
  const sanitized = JSON.parse(JSON.stringify(data));
  
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        
        if (allSensitiveFields.some(field => lowerKey.includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    }
  };
  
  sanitizeObject(sanitized);
  return sanitized;
}

module.exports = {
  performanceMiddleware,
  errorTrackingMiddleware,
  auditMiddleware,
  financialAuditMiddleware,
  securityMiddleware,
  complianceMiddleware,
  sanitizeSensitiveData
};