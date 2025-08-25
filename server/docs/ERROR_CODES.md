# Error Codes and Response Formats

## Overview

The RCM API uses standardized error responses with consistent HTTP status codes and detailed error information. This document provides a comprehensive reference for all error codes, their meanings, and how to handle them.

## Standard Error Response Format

All error responses follow this consistent structure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "details": {
    "field": "fieldName",
    "message": "Specific field error message",
    "value": "invalid_value"
  },
  "timestamp": "2023-12-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

### Response Fields

- `success` (boolean) - Always `false` for error responses
- `error` (string) - Human-readable error message
- `code` (string) - Machine-readable error code for programmatic handling
- `details` (object, optional) - Additional error details, validation errors, etc.
- `timestamp` (string) - ISO 8601 timestamp when error occurred
- `requestId` (string) - Unique request identifier for debugging

## HTTP Status Codes

### 2xx Success
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content to return

### 4xx Client Errors
- `400 Bad Request` - Invalid request parameters or body
- `401 Unauthorized` - Authentication required or failed
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (duplicate, etc.)
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded

### 5xx Server Errors
- `500 Internal Server Error` - Unexpected server error
- `502 Bad Gateway` - Upstream service error
- `503 Service Unavailable` - Service temporarily unavailable
- `504 Gateway Timeout` - Upstream service timeout

## Error Categories

### Authentication Errors (401)

#### INVALID_CREDENTIALS
```json
{
  "success": false,
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS",
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### TOKEN_EXPIRED
```json
{
  "success": false,
  "error": "JWT token has expired",
  "code": "TOKEN_EXPIRED",
  "details": {
    "expiredAt": "2023-12-15T09:30:00Z"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### TOKEN_INVALID
```json
{
  "success": false,
  "error": "Invalid or malformed JWT token",
  "code": "TOKEN_INVALID",
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### TOKEN_MISSING
```json
{
  "success": false,
  "error": "Authorization header is missing",
  "code": "TOKEN_MISSING",
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### ACCOUNT_LOCKED
```json
{
  "success": false,
  "error": "Account is locked due to multiple failed login attempts",
  "code": "ACCOUNT_LOCKED",
  "details": {
    "lockoutExpires": "2023-12-15T11:30:00Z",
    "attemptsRemaining": 0
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### ACCOUNT_DISABLED
```json
{
  "success": false,
  "error": "User account is disabled",
  "code": "ACCOUNT_DISABLED",
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### REFRESH_TOKEN_INVALID
```json
{
  "success": false,
  "error": "Refresh token is invalid or expired",
  "code": "REFRESH_TOKEN_INVALID",
  "timestamp": "2023-12-15T10:30:00Z"
}
```

### Authorization Errors (403)

#### INSUFFICIENT_PERMISSIONS
```json
{
  "success": false,
  "error": "Insufficient permissions to access this resource",
  "code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "required": "claims:create",
    "userPermissions": ["claims:read", "payments:read"]
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### ROLE_REQUIRED
```json
{
  "success": false,
  "error": "Admin role required for this operation",
  "code": "ROLE_REQUIRED",
  "details": {
    "required": ["admin"],
    "userRole": "provider"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### RESOURCE_ACCESS_DENIED
```json
{
  "success": false,
  "error": "Access denied to this specific resource",
  "code": "RESOURCE_ACCESS_DENIED",
  "details": {
    "resourceId": "claim_123",
    "resourceType": "claim"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

### Validation Errors (400/422)

#### VALIDATION_ERROR
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format",
        "value": "invalid-email"
      },
      {
        "field": "amount",
        "message": "Amount must be greater than 0",
        "value": -10
      }
    ]
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### REQUIRED_FIELD_MISSING
```json
{
  "success": false,
  "error": "Required field is missing",
  "code": "REQUIRED_FIELD_MISSING",
  "details": {
    "field": "patientId",
    "message": "Patient ID is required"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### INVALID_FORMAT
```json
{
  "success": false,
  "error": "Invalid data format",
  "code": "INVALID_FORMAT",
  "details": {
    "field": "serviceDate",
    "message": "Date must be in YYYY-MM-DD format",
    "value": "12/15/2023"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### INVALID_VALUE
```json
{
  "success": false,
  "error": "Invalid field value",
  "code": "INVALID_VALUE",
  "details": {
    "field": "status",
    "message": "Status must be one of: pending, approved, denied, paid, cancelled",
    "value": "invalid_status"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

### Resource Errors (404/409)

#### RESOURCE_NOT_FOUND
```json
{
  "success": false,
  "error": "Claim not found",
  "code": "RESOURCE_NOT_FOUND",
  "details": {
    "resourceType": "claim",
    "resourceId": "claim_123"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### RESOURCE_ALREADY_EXISTS
```json
{
  "success": false,
  "error": "Claim with this number already exists",
  "code": "RESOURCE_ALREADY_EXISTS",
  "details": {
    "resourceType": "claim",
    "field": "claimNumber",
    "value": "CLM-2023-001234"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### RESOURCE_CONFLICT
```json
{
  "success": false,
  "error": "Cannot delete claim with existing payments",
  "code": "RESOURCE_CONFLICT",
  "details": {
    "resourceType": "claim",
    "resourceId": "claim_123",
    "conflictReason": "has_payments"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

### Rate Limiting Errors (429)

#### RATE_LIMIT_EXCEEDED
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "window": "15 minutes",
    "retryAfter": 300
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### AUTH_RATE_LIMIT_EXCEEDED
```json
{
  "success": false,
  "error": "Too many login attempts",
  "code": "AUTH_RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 5,
    "window": "15 minutes",
    "retryAfter": 900
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

### Business Logic Errors (400/422)

#### INSUFFICIENT_BALANCE
```json
{
  "success": false,
  "error": "Payment amount exceeds claim balance",
  "code": "INSUFFICIENT_BALANCE",
  "details": {
    "claimId": "claim_123",
    "claimBalance": 50.00,
    "paymentAmount": 100.00
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### INVALID_STATUS_TRANSITION
```json
{
  "success": false,
  "error": "Cannot change claim status from paid to pending",
  "code": "INVALID_STATUS_TRANSITION",
  "details": {
    "currentStatus": "paid",
    "requestedStatus": "pending",
    "allowedTransitions": ["cancelled"]
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### EXPIRED_RESOURCE
```json
{
  "success": false,
  "error": "Claim has expired and cannot be modified",
  "code": "EXPIRED_RESOURCE",
  "details": {
    "resourceType": "claim",
    "resourceId": "claim_123",
    "expiredAt": "2023-11-15T00:00:00Z"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

### System Errors (500)

#### INTERNAL_SERVER_ERROR
```json
{
  "success": false,
  "error": "An unexpected error occurred",
  "code": "INTERNAL_SERVER_ERROR",
  "details": {
    "requestId": "req_123456789"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### DATABASE_ERROR
```json
{
  "success": false,
  "error": "Database operation failed",
  "code": "DATABASE_ERROR",
  "details": {
    "operation": "INSERT",
    "table": "claims"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

#### SERVICE_UNAVAILABLE
```json
{
  "success": false,
  "error": "Service is temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "details": {
    "retryAfter": 60,
    "maintenanceWindow": "2023-12-15T11:00:00Z to 2023-12-15T12:00:00Z"
  },
  "timestamp": "2023-12-15T10:30:00Z"
}
```

## Complete Error Code Reference

### Authentication & Authorization
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `TOKEN_INVALID` | 401 | Invalid or malformed JWT token |
| `TOKEN_MISSING` | 401 | Authorization header missing |
| `ACCOUNT_LOCKED` | 401 | Account locked due to failed attempts |
| `ACCOUNT_DISABLED` | 401 | User account is disabled |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `ROLE_REQUIRED` | 403 | Specific role required |
| `RESOURCE_ACCESS_DENIED` | 403 | Access denied to specific resource |

### Validation & Input
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | General validation failure |
| `REQUIRED_FIELD_MISSING` | 400 | Required field not provided |
| `INVALID_FORMAT` | 400 | Invalid data format |
| `INVALID_VALUE` | 400 | Invalid field value |
| `INVALID_JSON` | 400 | Malformed JSON in request body |
| `INVALID_QUERY_PARAMS` | 400 | Invalid query parameters |
| `REQUEST_TOO_LARGE` | 413 | Request body too large |

### Resources
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `RESOURCE_ALREADY_EXISTS` | 409 | Resource already exists |
| `RESOURCE_CONFLICT` | 409 | Resource conflict prevents operation |
| `RESOURCE_LOCKED` | 423 | Resource is locked |
| `RESOURCE_EXPIRED` | 410 | Resource has expired |

### Rate Limiting
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | General rate limit exceeded |
| `AUTH_RATE_LIMIT_EXCEEDED` | 429 | Authentication rate limit exceeded |
| `CREATE_RATE_LIMIT_EXCEEDED` | 429 | Create operation rate limit exceeded |
| `SEARCH_RATE_LIMIT_EXCEEDED` | 429 | Search rate limit exceeded |

### Business Logic
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INSUFFICIENT_BALANCE` | 422 | Payment exceeds available balance |
| `INVALID_STATUS_TRANSITION` | 422 | Invalid status change |
| `EXPIRED_RESOURCE` | 410 | Resource has expired |
| `DUPLICATE_OPERATION` | 409 | Operation already performed |
| `INVALID_OPERATION` | 422 | Operation not allowed in current state |

### System & Infrastructure
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `GATEWAY_TIMEOUT` | 504 | Upstream service timeout |
| `MAINTENANCE_MODE` | 503 | System in maintenance mode |

## Error Handling Best Practices

### Client-Side Error Handling

```javascript
async function handleApiCall(apiFunction) {
  try {
    const response = await apiFunction();
    return response.data;
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          if (data.code === 'TOKEN_EXPIRED') {
            // Try to refresh token
            await refreshToken();
            // Retry the original request
            return await apiFunction();
          } else {
            // Redirect to login
            redirectToLogin();
          }
          break;
          
        case 403:
          // Show access denied message
          showAccessDeniedMessage(data.error);
          break;
          
        case 422:
          // Handle validation errors
          if (data.code === 'VALIDATION_ERROR') {
            showValidationErrors(data.details.errors);
          }
          break;
          
        case 429:
          // Handle rate limiting
          const retryAfter = data.details?.retryAfter || 60;
          showRateLimitMessage(retryAfter);
          break;
          
        case 500:
          // Show generic error message
          showErrorMessage('An unexpected error occurred. Please try again.');
          break;
          
        default:
          showErrorMessage(data.error || 'An error occurred');
      }
    } else {
      // Network error
      showErrorMessage('Network error. Please check your connection.');
    }
    
    throw error;
  }
}
```

### Server-Side Error Response

```javascript
// Error response utility
function createErrorResponse(code, message, details = null, statusCode = 400) {
  return {
    success: false,
    error: message,
    code,
    details,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };
}

// Validation error handler
function handleValidationError(validationErrors) {
  const errors = validationErrors.map(err => ({
    field: err.path,
    message: err.message,
    value: err.value
  }));
  
  return createErrorResponse(
    'VALIDATION_ERROR',
    'Validation failed',
    { errors },
    422
  );
}

// Authentication error handler
function handleAuthError(type) {
  const errorMap = {
    'invalid_credentials': {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
      status: 401
    },
    'token_expired': {
      code: 'TOKEN_EXPIRED',
      message: 'JWT token has expired',
      status: 401
    },
    'insufficient_permissions': {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Insufficient permissions',
      status: 403
    }
  };
  
  const error = errorMap[type];
  return createErrorResponse(error.code, error.message, null, error.status);
}
```

### Error Logging

```javascript
// Error logging middleware
function errorLogger(err, req, res, next) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    }
  };
  
  // Log to appropriate service based on severity
  if (err.status >= 500) {
    logger.error('Server Error', errorLog);
    // Send to error tracking service (Sentry, etc.)
    errorTracker.captureException(err, errorLog);
  } else if (err.status >= 400) {
    logger.warn('Client Error', errorLog);
  }
  
  next(err);
}
```

## Testing Error Responses

### Unit Test Examples

```javascript
describe('Error Handling', () => {
  it('should return validation error for missing required field', async () => {
    const response = await request(app)
      .post('/api/v1/rcm/claims')
      .send({}) // Missing required fields
      .expect(422);
    
    expect(response.body).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
      details: {
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'patientId',
            message: expect.stringContaining('required')
          })
        ])
      }
    });
  });
  
  it('should return authentication error for invalid token', async () => {
    const response = await request(app)
      .get('/api/v1/rcm/claims')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);
    
    expect(response.body).toMatchObject({
      success: false,
      code: 'TOKEN_INVALID',
      error: expect.stringContaining('Invalid')
    });
  });
});
```

## Monitoring and Alerting

### Error Rate Monitoring

```javascript
// Monitor error rates by code
const errorRates = {
  'VALIDATION_ERROR': { count: 0, threshold: 100 },
  'TOKEN_EXPIRED': { count: 0, threshold: 50 },
  'INTERNAL_SERVER_ERROR': { count: 0, threshold: 10 }
};

function trackError(errorCode) {
  if (errorRates[errorCode]) {
    errorRates[errorCode].count++;
    
    if (errorRates[errorCode].count > errorRates[errorCode].threshold) {
      // Send alert
      alertService.send({
        type: 'HIGH_ERROR_RATE',
        code: errorCode,
        count: errorRates[errorCode].count,
        threshold: errorRates[errorCode].threshold
      });
    }
  }
}
```

This comprehensive error handling system ensures consistent, informative error responses that help both developers and end-users understand and resolve issues effectively.