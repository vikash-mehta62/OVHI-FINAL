/**
 * Advanced Rate Limiting Middleware
 * Comprehensive rate limiting with multiple strategies and security features
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { auditLogger } = require('../utils/auditLogger');
const { errorTracker } = require('../utils/errorTracker');

class RateLimitManager {
  constructor() {
    this.rateLimitStore = new Map();
    this.suspiciousIPs = new Set();
    this.blockedIPs = new Set();
    this.whitelist = new Set(['127.0.0.1', '::1']); // Localhost
    
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get client identifier (IP + User ID if available)
   */
  getClientId(req) {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userId = req.user?.id;
    return userId ? `${ip}:${userId}` : ip;
  }

  /**
   * Check if IP is whitelisted
   */
  isWhitelisted(ip) {
    return this.whitelist.has(ip);
  }

  /**
   * Add IP to whitelist
   */
  addToWhitelist(ip) {
    this.whitelist.add(ip);
  }

  /**
   * Block IP temporarily
   */
  blockIP(ip, duration = 3600000) { // 1 hour default
    this.blockedIPs.add(ip);
    setTimeout(() => {
      this.blockedIPs.delete(ip);
    }, duration);
  }

  /**
   * Check if IP is blocked
   */
  isBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * Mark IP as suspicious
   */
  markSuspicious(ip) {
    this.suspiciousIPs.add(ip);
    
    // Auto-block after multiple suspicious activities
    const suspiciousCount = this.getSuspiciousCount(ip);
    if (suspiciousCount > 5) {
      this.blockIP(ip, 24 * 60 * 60 * 1000); // 24 hours
      
      auditLogger.logSecurityEvent('IP_AUTO_BLOCKED', {
        ipAddress: ip,
        reason: 'Multiple suspicious activities',
        suspiciousCount,
        severity: 'HIGH'
      });
    }
  }

  /**
   * Get suspicious activity count for IP
   */
  getSuspiciousCount(ip) {
    // This would typically be stored in Redis or database
    // For now, using in-memory count
    return Array.from(this.suspiciousIPs).filter(suspiciousIP => suspiciousIP === ip).length;
  }

  /**
   * Cleanup old entries
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (now - data.firstRequest > maxAge) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Custom rate limit handler
   */
  createRateLimitHandler(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 100, // requests per window
      message = 'Too many requests from this IP',
      skipWhitelisted = true,
      blockOnExceed = false,
      progressiveDelay = false
    } = options;

    return (req, res, next) => {
      const clientId = this.getClientId(req);
      const ip = req.ip || req.connection.remoteAddress;
      
      // Skip if whitelisted
      if (skipWhitelisted && this.isWhitelisted(ip)) {
        return next();
      }
      
      // Block if IP is blocked
      if (this.isBlocked(ip)) {
        auditLogger.logSecurityEvent('BLOCKED_IP_ACCESS_ATTEMPT', {
          ipAddress: ip,
          url: req.originalUrl,
          userAgent: req.get('User-Agent'),
          severity: 'HIGH'
        });
        
        return res.status(403).json({
          success: false,
          error: 'Access denied. IP address is blocked.',
          code: 'IP_BLOCKED'
        });
      }
      
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Get or create rate limit data
      if (!this.rateLimitStore.has(clientId)) {
        this.rateLimitStore.set(clientId, {
          requests: [],
          firstRequest: now,
          violations: 0
        });
      }
      
      const clientData = this.rateLimitStore.get(clientId);
      
      // Remove old requests outside the window
      clientData.requests = clientData.requests.filter(time => time > windowStart);
      
      // Check if limit exceeded
      if (clientData.requests.length >= max) {
        clientData.violations++;
        
        // Log rate limit violation
        auditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          ipAddress: ip,
          userId: req.user?.id,
          url: req.originalUrl,
          requestCount: clientData.requests.length,
          timeWindow: windowMs,
          violations: clientData.violations,
          severity: 'WARNING'
        });
        
        // Mark as suspicious after multiple violations
        if (clientData.violations > 3) {
          this.markSuspicious(ip);
        }
        
        // Block IP if configured
        if (blockOnExceed && clientData.violations > 5) {
          this.blockIP(ip);
        }
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': max,
          'X-RateLimit-Remaining': 0,
          'X-RateLimit-Reset': new Date(now + windowMs).toISOString(),
          'Retry-After': Math.ceil(windowMs / 1000)
        });
        
        return res.status(429).json({
          success: false,
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      // Add current request
      clientData.requests.push(now);
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': max - clientData.requests.length,
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });
      
      // Apply progressive delay if configured
      if (progressiveDelay && clientData.requests.length > max * 0.8) {
        const delay = Math.min(1000, (clientData.requests.length - max * 0.8) * 100);
        setTimeout(next, delay);
      } else {
        next();
      }
    };
  }
}

// Create singleton instance
const rateLimitManager = new RateLimitManager();

// Predefined rate limiters for different scenarios

/**
 * General API rate limiter
 */
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    auditLogger.logSecurityEvent('GENERAL_RATE_LIMIT_EXCEEDED', {
      ipAddress: ip,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      severity: 'WARNING'
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Authentication rate limiter (stricter)
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    auditLogger.logSecurityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
      ipAddress: ip,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      severity: 'HIGH'
    });
    
    // Mark IP as suspicious after auth rate limit
    rateLimitManager.markSuspicious(ip);
    
    res.status(429).json({
      success: false,
      error: 'Too many login attempts from this IP, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * API creation rate limiter
 */
const createRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 create requests per minute
  message: {
    success: false,
    error: 'Too many create requests, please slow down.',
    code: 'CREATE_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * File upload rate limiter
 */
const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 uploads per minute
  message: {
    success: false,
    error: 'Too many file uploads, please wait before uploading again.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Search rate limiter
 */
const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 searches per minute
  message: {
    success: false,
    error: 'Too many search requests, please slow down.',
    code: 'SEARCH_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Progressive delay middleware for suspicious activity
 */
const progressiveDelay = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 5000, // maximum delay of 5 seconds
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  onLimitReached: (req, res, options) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    auditLogger.logSecurityEvent('PROGRESSIVE_DELAY_TRIGGERED', {
      ipAddress: ip,
      url: req.originalUrl,
      delay: options.delay,
      severity: 'WARNING'
    });
  }
});

/**
 * Brute force protection middleware
 */
const bruteForceProtection = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const clientId = rateLimitManager.getClientId(req);
  
  // Check for brute force patterns
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxAttempts = 20;
  
  if (!rateLimitManager.rateLimitStore.has(clientId)) {
    rateLimitManager.rateLimitStore.set(clientId, {
      requests: [],
      firstRequest: now,
      violations: 0
    });
  }
  
  const clientData = rateLimitManager.rateLimitStore.get(clientId);
  const recentRequests = clientData.requests.filter(time => now - time < windowMs);
  
  if (recentRequests.length > maxAttempts) {
    // Potential brute force attack
    auditLogger.logSecurityEvent('BRUTE_FORCE_DETECTED', {
      ipAddress: ip,
      userId: req.user?.id,
      requestCount: recentRequests.length,
      timeWindow: windowMs,
      severity: 'CRITICAL'
    });
    
    // Block IP for 1 hour
    rateLimitManager.blockIP(ip, 60 * 60 * 1000);
    
    return res.status(429).json({
      success: false,
      error: 'Suspicious activity detected. Access temporarily blocked.',
      code: 'BRUTE_FORCE_BLOCKED'
    });
  }
  
  next();
};

/**
 * DDoS protection middleware
 */
const ddosProtection = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 200; // Very high threshold for DDoS detection
  
  const clientId = `ddos:${ip}`;
  
  if (!rateLimitManager.rateLimitStore.has(clientId)) {
    rateLimitManager.rateLimitStore.set(clientId, {
      requests: [],
      firstRequest: now
    });
  }
  
  const clientData = rateLimitManager.rateLimitStore.get(clientId);
  clientData.requests = clientData.requests.filter(time => now - time < windowMs);
  
  if (clientData.requests.length > maxRequests) {
    // Potential DDoS attack
    auditLogger.logSecurityEvent('DDOS_ATTACK_DETECTED', {
      ipAddress: ip,
      requestCount: clientData.requests.length,
      timeWindow: windowMs,
      severity: 'CRITICAL'
    });
    
    // Block IP for 24 hours
    rateLimitManager.blockIP(ip, 24 * 60 * 60 * 1000);
    
    return res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable.',
      code: 'DDOS_PROTECTION'
    });
  }
  
  clientData.requests.push(now);
  next();
};

/**
 * Adaptive rate limiting based on system load
 */
const adaptiveRateLimit = (req, res, next) => {
  const systemLoad = require('os').loadavg()[0];
  const cpuCount = require('os').cpus().length;
  const loadPercentage = (systemLoad / cpuCount) * 100;
  
  let maxRequests = 100; // Default
  
  if (loadPercentage > 80) {
    maxRequests = 20; // Severely limit under high load
  } else if (loadPercentage > 60) {
    maxRequests = 50; // Moderately limit under medium load
  }
  
  const customRateLimit = rateLimitManager.createRateLimitHandler({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    message: 'System under high load. Please try again later.'
  });
  
  customRateLimit(req, res, next);
};

module.exports = {
  rateLimitManager,
  generalRateLimit,
  authRateLimit,
  createRateLimit,
  uploadRateLimit,
  searchRateLimit,
  progressiveDelay,
  bruteForceProtection,
  ddosProtection,
  adaptiveRateLimit
};