/**
 * Security Headers Middleware
 * Comprehensive security headers for protection against various attacks
 */

const helmet = require('helmet');

/**
 * Content Security Policy configuration
 */
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for some React functionality
      "'unsafe-eval'", // Required for development
      "https://cdn.jsdelivr.net",
      "https://unpkg.com",
      "https://cdnjs.cloudflare.com"
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for styled-components and CSS-in-JS
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "https://cdn.jsdelivr.net",
      "data:"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https:",
      "blob:"
    ],
    connectSrc: [
      "'self'",
      "https://api.stripe.com",
      "wss://localhost:*", // WebSocket for development
      "ws://localhost:*"
    ],
    frameSrc: [
      "'self'",
      "https://js.stripe.com",
      "https://hooks.stripe.com"
    ],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'", "blob:"],
    childSrc: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
  },
  reportOnly: process.env.NODE_ENV === 'development'
};

/**
 * Helmet configuration for comprehensive security headers
 */
const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: cspConfig,
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false
  },
  
  // Frameguard (X-Frame-Options)
  frameguard: {
    action: 'deny'
  },
  
  // Hide Powered-By header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // Don't Sniff Mimetype
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  },
  
  // Referrer Policy
  referrerPolicy: {
    policy: ['no-referrer', 'strict-origin-when-cross-origin']
  },
  
  // XSS Filter
  xssFilter: true
};

/**
 * Custom security headers middleware
 */
const customSecurityHeaders = (req, res, next) => {
  // Additional custom headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Cache control for sensitive pages
  if (req.originalUrl.includes('/api/') || req.originalUrl.includes('/admin/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  // Feature Policy / Permissions Policy
  res.setHeader('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()',
    'fullscreen=(self)'
  ].join(', '));
  
  // Cross-Origin policies
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Server information hiding
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

/**
 * CORS configuration with security considerations
 */
const corsConfig = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://localhost:3000',
      'https://localhost:8080'
    ];
    
    // Add production origins from environment
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400 // 24 hours
};

/**
 * CSRF protection middleware
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and API endpoints with proper authentication
  if (req.method === 'GET' || req.originalUrl.startsWith('/api/v1/auth/')) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }
  
  next();
};

/**
 * Generate CSRF token
 */
const generateCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
  }
  
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

/**
 * Security middleware for file uploads
 */
const fileUploadSecurity = (req, res, next) => {
  // Set security headers for file uploads
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'attachment');
  
  // Validate file upload requests
  if (req.files || req.file) {
    const files = req.files ? Object.values(req.files).flat() : [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          error: 'File too large. Maximum size is 10MB.',
          code: 'FILE_TOO_LARGE'
        });
      }
      
      // Check file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'File type not allowed.',
          code: 'INVALID_FILE_TYPE'
        });
      }
      
      // Sanitize filename
      file.originalname = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    }
  }
  
  next();
};

/**
 * API versioning security middleware
 */
const apiVersionSecurity = (req, res, next) => {
  const apiVersion = req.headers['api-version'] || req.query.version;
  
  // Ensure API version is specified and valid
  if (req.originalUrl.startsWith('/api/') && !req.originalUrl.includes('/v1/')) {
    if (!apiVersion || !['1.0', 'v1'].includes(apiVersion)) {
      return res.status(400).json({
        success: false,
        error: 'API version required. Please specify version in header or query parameter.',
        code: 'API_VERSION_REQUIRED'
      });
    }
  }
  
  next();
};

/**
 * Request size limiting middleware
 */
const requestSizeLimiting = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      code: 'REQUEST_TOO_LARGE'
    });
  }
  
  next();
};

/**
 * IP filtering middleware
 */
const ipFiltering = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Block known malicious IPs (this would typically come from a database or external service)
  const blockedIPs = process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',') : [];
  
  if (blockedIPs.includes(ip)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      code: 'IP_BLOCKED'
    });
  }
  
  // Allow only specific IPs in production if configured
  if (process.env.NODE_ENV === 'production' && process.env.ALLOWED_IPS) {
    const allowedIPs = process.env.ALLOWED_IPS.split(',');
    if (!allowedIPs.includes(ip) && !ip.startsWith('127.') && ip !== '::1') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'IP_NOT_ALLOWED'
      });
    }
  }
  
  next();
};

/**
 * User agent validation middleware
 */
const userAgentValidation = (req, res, next) => {
  const userAgent = req.headers['user-agent'];
  
  // Block requests without user agent (potential bots)
  if (!userAgent) {
    return res.status(400).json({
      success: false,
      error: 'User agent required',
      code: 'USER_AGENT_REQUIRED'
    });
  }
  
  // Block known malicious user agents
  const maliciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /openvas/i,
    /nmap/i,
    /masscan/i,
    /zap/i
  ];
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(userAgent)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'MALICIOUS_USER_AGENT'
      });
    }
  }
  
  next();
};

/**
 * Comprehensive security middleware stack
 */
const securityMiddlewareStack = [
  helmet(helmetConfig),
  customSecurityHeaders,
  requestSizeLimiting,
  ipFiltering,
  userAgentValidation,
  apiVersionSecurity
];

module.exports = {
  helmetConfig,
  corsConfig,
  customSecurityHeaders,
  csrfProtection,
  generateCSRFToken,
  fileUploadSecurity,
  apiVersionSecurity,
  requestSizeLimiting,
  ipFiltering,
  userAgentValidation,
  securityMiddlewareStack
};