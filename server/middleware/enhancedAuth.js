/**
 * Enhanced Authentication Middleware with Security Features
 * Provides comprehensive authentication and authorization for RCM module
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

/**
 * Session tracking for concurrent session management
 */
const activeSessions = new Map();

/**
 * Failed login attempts tracking
 */
const failedAttempts = new Map();

/**
 * Enhanced JWT verification with additional security checks
 */
const enhancedVerifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid token format',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        let errorCode = 'TOKEN_VERIFICATION_FAILED';
        let errorMessage = 'Token verification failed';
        
        if (err.name === 'TokenExpiredError') {
          errorCode = 'TOKEN_EXPIRED';
          errorMessage = 'Token has expired';
        } else if (err.name === 'JsonWebTokenError') {
          errorCode = 'INVALID_TOKEN';
          errorMessage = 'Invalid token';
        }
        
        return res.status(401).json({
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Additional security checks
      const securityCheck = performSecurityChecks(decoded, req, token);
      if (!securityCheck.valid) {
        return res.status(401).json({
          success: false,
          error: {
            code: securityCheck.code,
            message: securityCheck.message,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Attach user info to request
      req.user = {
        user_id: decoded.user_id,
        email: decoded.email,
        role: decoded.role || 'viewer',
        permissions: decoded.permissions || [],
        sessionId: decoded.sessionId,
        loginTime: decoded.iat,
        tokenHash: crypto.createHash('sha256').update(token).digest('hex')
      };
      
      // Update session tracking
      updateSessionTracking(req.user);
      
      // Check for token refresh requirement
      checkTokenRefreshRequirement(decoded, res);
      
      next();
    });
    
  } catch (error) {
    console.error('Enhanced auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_MIDDLEWARE_ERROR',
        message: 'Authentication system error',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Perform additional security checks on the token
 */
const performSecurityChecks = (decoded, req, token) => {
  // Check token age
  const tokenAge = Date.now() - (decoded.iat * 1000);
  const maxTokenAge = 8 * 60 * 60 * 1000; // 8 hours
  
  if (tokenAge > maxTokenAge) {
    return {
      valid: false,
      code: 'TOKEN_TOO_OLD',
      message: 'Token has exceeded maximum age'
    };
  }
  
  // Check for suspicious IP changes (if IP tracking is enabled)
  if (decoded.ip && process.env.ENABLE_IP_TRACKING === 'true') {
    const currentIP = req.ip || req.connection.remoteAddress;
    if (decoded.ip !== currentIP) {
      console.warn(`IP change detected for user ${decoded.user_id}: ${decoded.ip} -> ${currentIP}`);
      // In production, you might want to invalidate the token or require re-authentication
    }
  }
  
  // Check for concurrent session limits
  const userSessions = activeSessions.get(decoded.user_id) || [];
  const maxConcurrentSessions = 3;
  
  if (userSessions.length >= maxConcurrentSessions) {
    // Check if current session is in the list
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const sessionExists = userSessions.some(session => session.tokenHash === tokenHash);
    
    if (!sessionExists) {
      return {
        valid: false,
        code: 'MAX_SESSIONS_EXCEEDED',
        message: 'Maximum concurrent sessions exceeded'
      };
    }
  }
  
  // Check if user account is locked
  const failedLoginAttempts = failedAttempts.get(decoded.user_id) || { count: 0, lastAttempt: 0 };
  if (failedLoginAttempts.count >= 5) {
    const lockoutDuration = 30 * 60 * 1000; // 30 minutes
    if (Date.now() - failedLoginAttempts.lastAttempt < lockoutDuration) {
      return {
        valid: false,
        code: 'ACCOUNT_LOCKED',
        message: 'Account is temporarily locked due to failed login attempts'
      };
    }
  }
  
  return { valid: true };
};

/**
 * Update session tracking
 */
const updateSessionTracking = (user) => {
  const userSessions = activeSessions.get(user.user_id) || [];
  
  // Find existing session or create new one
  const existingSessionIndex = userSessions.findIndex(
    session => session.tokenHash === user.tokenHash
  );
  
  const sessionData = {
    tokenHash: user.tokenHash,
    loginTime: user.loginTime,
    lastActivity: Date.now(),
    sessionId: user.sessionId
  };
  
  if (existingSessionIndex >= 0) {
    userSessions[existingSessionIndex] = sessionData;
  } else {
    userSessions.push(sessionData);
  }
  
  // Keep only the most recent sessions
  const maxSessions = 3;
  if (userSessions.length > maxSessions) {
    userSessions.sort((a, b) => b.lastActivity - a.lastActivity);
    userSessions.splice(maxSessions);
  }
  
  activeSessions.set(user.user_id, userSessions);
};

/**
 * Check if token needs refresh
 */
const checkTokenRefreshRequirement = (decoded, res) => {
  const tokenAge = Date.now() - (decoded.iat * 1000);
  const refreshThreshold = 30 * 60 * 1000; // 30 minutes
  const maxTokenAge = 8 * 60 * 60 * 1000; // 8 hours
  
  if (tokenAge > (maxTokenAge - refreshThreshold)) {
    res.set('X-Token-Refresh-Required', 'true');
    res.set('X-Token-Expires-In', Math.floor((maxTokenAge - tokenAge) / 1000));
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const userRole = req.user.role;
    const hasPermission = Array.isArray(allowedRoles) 
      ? allowedRoles.includes(userRole)
      : allowedRoles === userRole;
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'Insufficient role permissions',
          requiredRoles: allowedRoles,
          userRole: userRole,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    next();
  };
};

/**
 * Permission-based authorization middleware
 */
const requirePermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(permission => 
        !userPermissions.includes(permission)
      );
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions',
          requiredPermissions: requiredPermissions,
          missingPermissions: missingPermissions,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    next();
  };
};

/**
 * Brute force protection middleware
 */
const bruteForceProtection = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts per window
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body.email || req.body.username || 'unknown');
  },
  handler: (req, res) => {
    const identifier = req.body.email || req.body.username || req.ip;
    
    // Track failed attempts
    const attempts = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    attempts.count += 1;
    attempts.lastAttempt = Date.now();
    failedAttempts.set(identifier, attempts);
    
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed login attempts. Please try again later.',
        retryAfter: '15 minutes',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Session cleanup utility
 */
const cleanupExpiredSessions = () => {
  const now = Date.now();
  const sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
  
  for (const [userId, sessions] of activeSessions.entries()) {
    const activeSessions = sessions.filter(session => 
      (now - session.lastActivity) < sessionTimeout
    );
    
    if (activeSessions.length === 0) {
      activeSessions.delete(userId);
    } else {
      activeSessions.set(userId, activeSessions);
    }
  }
  
  // Cleanup failed attempts older than 24 hours
  const attemptTimeout = 24 * 60 * 60 * 1000; // 24 hours
  for (const [identifier, attempts] of failedAttempts.entries()) {
    if ((now - attempts.lastAttempt) > attemptTimeout) {
      failedAttempts.delete(identifier);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

/**
 * Get active sessions for a user
 */
const getUserSessions = (userId) => {
  return activeSessions.get(userId) || [];
};

/**
 * Invalidate all sessions for a user
 */
const invalidateUserSessions = (userId) => {
  activeSessions.delete(userId);
  return true;
};

/**
 * Invalidate specific session
 */
const invalidateSession = (userId, tokenHash) => {
  const userSessions = activeSessions.get(userId) || [];
  const filteredSessions = userSessions.filter(session => 
    session.tokenHash !== tokenHash
  );
  
  if (filteredSessions.length === 0) {
    activeSessions.delete(userId);
  } else {
    activeSessions.set(userId, filteredSessions);
  }
  
  return true;
};

module.exports = {
  enhancedVerifyToken,
  requireRole,
  requirePermissions,
  bruteForceProtection,
  getUserSessions,
  invalidateUserSessions,
  invalidateSession,
  cleanupExpiredSessions
};