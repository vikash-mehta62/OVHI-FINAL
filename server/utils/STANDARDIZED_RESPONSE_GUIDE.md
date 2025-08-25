# Standardized Response Formats Guide

## Overview

This document outlines the standardized response format system implemented across all RCM endpoints. The system provides consistent API responses, proper HTTP status codes, comprehensive error handling, and enhanced pagination metadata.

## Core Components

### 1. StandardizedAPIResponse Class

The main response class that provides consistent structure for all API responses.

#### Basic Structure
```javascript
{
  "success": true|false,
  "timestamp": "2024-12-01T10:30:00.000Z",
  "version": "1.0",
  "data": {...},           // Present on success
  "message": "...",        // Optional success/error message
  "meta": {...},          // Optional metadata
  "error": {...}          // Present on error
}
```

#### Success Response Example
```javascript
{
  "success": true,
  "timestamp": "2024-12-01T10:30:00.000Z",
  "version": "1.0",
  "data": {
    "claims": [...],
    "appliedFilters": {...}
  },
  "message": "Claims retrieved successfully",
  "meta": {
    "pagination": {
      "currentPage": 1,
      "limit": 10,
      "totalRecords": 150,
      "totalPages": 15,
      "hasNextPage": true,
      "hasPreviousPage": false,
      "nextPage": 2,
      "previousPage": null
    }
  }
}
```

#### Error Response Example
```javascript
{
  "success": false,
  "timestamp": "2024-12-01T10:30:00.000Z",
  "version": "1.0",
  "message": "Validation failed",
  "error": {
    "details": {
      "validationErrors": [
        {
          "field": "claimId",
          "message": "Valid claim ID is required"
        }
      ],
      "type": "VALIDATION_ERROR"
    },
    "code": "VALIDATION_FAILED",
    "timestamp": "2024-12-01T10:30:00.000Z"
  }
}
```

### 2. Response Status Codes

Standardized HTTP status codes for different scenarios:

```javascript
const ResponseStatusCodes = {
  SUCCESS: 200,           // Successful GET, PUT, PATCH
  CREATED: 201,           // Successful POST (resource created)
  ACCEPTED: 202,          // Request accepted for processing
  NO_CONTENT: 204,        // Successful DELETE
  BAD_REQUEST: 400,       // Validation errors, malformed requests
  UNAUTHORIZED: 401,      // Authentication required
  FORBIDDEN: 403,         // Access denied
  NOT_FOUND: 404,         // Resource not found
  CONFLICT: 409,          // Resource conflict
  UNPROCESSABLE_ENTITY: 422, // Semantic errors
  TOO_MANY_REQUESTS: 429, // Rate limiting
  INTERNAL_SERVER_ERROR: 500, // Server errors
  BAD_GATEWAY: 502,       // Upstream errors
  SERVICE_UNAVAILABLE: 503 // Service temporarily unavailable
};
```

### 3. Enhanced Pagination Metadata

Comprehensive pagination information for list endpoints:

```javascript
{
  "pagination": {
    "currentPage": 1,
    "limit": 10,
    "totalRecords": 150,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "nextPage": 2,
    "previousPage": null
  }
}
```

### 4. Response Formatters

Specialized formatters for different data types:

#### Dashboard Formatter
```javascript
ResponseFormatter.dashboard(data) // Returns formatted dashboard data
```

#### Claims List Formatter
```javascript
ResponseFormatter.claimsList(claims, filters) // Returns formatted claims with filters
```

#### Single Claim Formatter
```javascript
ResponseFormatter.claim(claim) // Returns formatted single claim
```

#### Collections Formatter
```javascript
ResponseFormatter.collections(accounts, filters) // Returns formatted collections data
```

#### Payments Formatter
```javascript
ResponseFormatter.payments(payments, filters) // Returns formatted payment data
```

#### ERA Processing Formatter
```javascript
ResponseFormatter.eraProcessing(data) // Returns formatted ERA processing results
```

## Static Response Methods

### Success Responses

#### Standard Success
```javascript
StandardizedAPIResponse.success(data, message, meta)
```

#### Created Resource
```javascript
StandardizedAPIResponse.created(data, message, resourceId)
```

#### Updated Resource
```javascript
StandardizedAPIResponse.updated(data, message, resourceId)
```

#### Deleted Resource
```javascript
StandardizedAPIResponse.deleted(message, resourceId)
```

#### Paginated Response
```javascript
StandardizedAPIResponse.paginated(data, pagination, message, filters)
```

### Error Responses

#### Validation Error
```javascript
StandardizedAPIResponse.validationError(validationErrors, message)
```

#### Not Found
```javascript
StandardizedAPIResponse.notFound(resource, identifier)
```

#### Unauthorized
```javascript
StandardizedAPIResponse.unauthorized(message)
```

#### Forbidden
```javascript
StandardizedAPIResponse.forbidden(message)
```

#### Conflict
```javascript
StandardizedAPIResponse.conflict(message, conflictDetails)
```

#### Rate Limit
```javascript
StandardizedAPIResponse.rateLimit(message, rateLimitInfo)
```

## Response Helpers

Convenient helper functions for sending responses:

### Success Helpers
```javascript
ResponseHelpers.sendSuccess(res, data, message, statusCode, meta)
ResponseHelpers.sendCreated(res, data, message, resourceId)
ResponseHelpers.sendPaginated(res, data, pagination, message, filters)
```

### Error Helpers
```javascript
ResponseHelpers.sendError(res, message, statusCode, details, errorCode)
ResponseHelpers.sendValidationError(res, validationErrors, message)
ResponseHelpers.sendNotFound(res, resource, identifier)
```

## Implementation Examples

### 1. Controller Method with Standardized Response

```javascript
const getClaimsStatus = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;
    
    // Get data from service
    const result = await rcmService.getClaimsStatus({ page, limit, status });
    
    // Format response
    const formattedClaims = ResponseFormatter.claimsList(result.claims, { status });
    
    // Send paginated response
    ResponseHelpers.sendPaginated(
      res, 
      formattedClaims.claims, 
      result.pagination, 
      'Claims retrieved successfully',
      formattedClaims.appliedFilters
    );
    
  } catch (error) {
    handleControllerError(error, res, 'Get claims status');
  }
};
```

### 2. Service Method with Formatted Response

```javascript
async getClaimsStatus(options = {}) {
  try {
    const { page, limit, status } = options;
    
    // Execute query with pagination
    const result = await executeQueryWithPagination(query, params, page, limit);
    
    // Format response using standardized formatter
    const formattedClaims = ResponseFormatter.claimsList(result.data, { status });
    
    return {
      ...formattedClaims,
      pagination: result.pagination
    };
    
  } catch (error) {
    throw createDatabaseError('Failed to fetch claims status', {
      originalError: error.message,
      options
    });
  }
}
```

### 3. Validation Error Response

```javascript
// Input validation
if (!claimId || isNaN(claimId)) {
  return ResponseHelpers.sendValidationError(res, [
    { field: 'claimId', message: 'Valid claim ID is required' }
  ]);
}
```

### 4. Not Found Response

```javascript
// Resource not found
if (!claim) {
  return ResponseHelpers.sendNotFound(res, 'Claim', claimId);
}
```

### 5. Created Resource Response

```javascript
// Resource created
const newClaim = await rcmService.createClaim(claimData);
ResponseHelpers.sendCreated(res, newClaim, 'Claim created successfully', newClaim.id);
```

## Error Response Formats

### Validation Error Format
```javascript
{
  "success": false,
  "timestamp": "2024-12-01T10:30:00.000Z",
  "version": "1.0",
  "message": "Validation failed",
  "error": {
    "details": {
      "validationErrors": [
        {
          "field": "claimId",
          "message": "Valid claim ID is required"
        },
        {
          "field": "status",
          "message": "Invalid status value"
        }
      ],
      "type": "VALIDATION_ERROR"
    },
    "code": "VALIDATION_FAILED",
    "timestamp": "2024-12-01T10:30:00.000Z"
  }
}
```

### Not Found Error Format
```javascript
{
  "success": false,
  "timestamp": "2024-12-01T10:30:00.000Z",
  "version": "1.0",
  "message": "Claim with identifier '12345' not found",
  "error": {
    "details": {
      "resource": "Claim",
      "identifier": "12345",
      "type": "NOT_FOUND"
    },
    "code": "RESOURCE_NOT_FOUND",
    "timestamp": "2024-12-01T10:30:00.000Z"
  }
}
```

### Database Error Format
```javascript
{
  "success": false,
  "timestamp": "2024-12-01T10:30:00.000Z",
  "version": "1.0",
  "message": "Failed to fetch claims status",
  "error": {
    "details": {
      "originalError": "Connection timeout",
      "context": { "userId": 123, "filters": {...} },
      "type": "DATABASE_ERROR"
    },
    "code": "DATABASE_OPERATION_FAILED",
    "timestamp": "2024-12-01T10:30:00.000Z"
  }
}
```

## Migration Guide

### Step 1: Update Imports
```javascript
// Add to controller files
const {
  StandardizedAPIResponse,
  ResponseStatusCodes,
  ResponseHelpers,
  ResponseFormatter
} = require('../../utils/standardizedResponse');
```

### Step 2: Replace Response Calls
```javascript
// Before
res.status(200).json({
  success: true,
  data: claims,
  message: 'Claims retrieved successfully'
});

// After
ResponseHelpers.sendSuccess(res, claims, 'Claims retrieved successfully');
```

### Step 3: Use Response Formatters
```javascript
// Before
const formattedClaims = claims.map(claim => ({
  id: claim.id,
  patientName: claim.patient_name,
  // ... manual formatting
}));

// After
const formattedClaims = ResponseFormatter.claimsList(claims, filters);
```

### Step 4: Standardize Error Responses
```javascript
// Before
res.status(400).json({
  success: false,
  message: 'Validation failed',
  errors: validationErrors
});

// After
ResponseHelpers.sendValidationError(res, validationErrors, 'Validation failed');
```

## Benefits

### 1. Consistency
- All endpoints return responses in the same format
- Consistent error structures across the application
- Standardized pagination metadata

### 2. Developer Experience
- Predictable response structures for frontend developers
- Clear error messages with proper context
- Comprehensive metadata for debugging

### 3. Maintainability
- Centralized response formatting logic
- Easy to update response structures globally
- Reduced code duplication

### 4. API Documentation
- Self-documenting response structures
- Clear error code mappings
- Consistent HTTP status code usage

### 5. Frontend Integration
- Easier to build generic error handling
- Consistent data structures for UI components
- Predictable pagination handling

## Testing

### Unit Tests for Response Formatters
```javascript
describe('ResponseFormatter', () => {
  it('should format claims list correctly', () => {
    const claims = [{ id: 1, patient_name: 'John Doe' }];
    const formatted = ResponseFormatter.claimsList(claims, { status: 'active' });
    
    expect(formatted).toHaveProperty('claims');
    expect(formatted).toHaveProperty('appliedFilters');
    expect(formatted.claims[0]).toHaveProperty('patientName', 'John Doe');
  });
});
```

### Integration Tests for API Responses
```javascript
describe('GET /api/rcm/claims', () => {
  it('should return standardized response format', async () => {
    const response = await request(app)
      .get('/api/rcm/claims')
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version', '1.0');
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta.pagination');
  });
});
```

## Best Practices

### 1. Always Use Response Helpers
```javascript
// Good
ResponseHelpers.sendSuccess(res, data, message);

// Avoid
res.json({ success: true, data });
```

### 2. Use Appropriate Status Codes
```javascript
// Good
ResponseHelpers.sendCreated(res, newResource, 'Resource created', newResource.id);

// Avoid
ResponseHelpers.sendSuccess(res, newResource, 'Resource created');
```

### 3. Provide Meaningful Error Messages
```javascript
// Good
ResponseHelpers.sendValidationError(res, [
  { field: 'email', message: 'Valid email address is required' }
]);

// Avoid
ResponseHelpers.sendError(res, 'Invalid input');
```

### 4. Include Relevant Metadata
```javascript
// Good
ResponseHelpers.sendPaginated(res, data, pagination, message, filters);

// Avoid
ResponseHelpers.sendSuccess(res, data, message);
```

### 5. Use Response Formatters
```javascript
// Good
const formatted = ResponseFormatter.claimsList(claims, filters);
ResponseHelpers.sendPaginated(res, formatted.claims, pagination, message, formatted.appliedFilters);

// Avoid
ResponseHelpers.sendPaginated(res, claims, pagination, message);
```

This standardized response system ensures consistency, improves developer experience, and provides a solid foundation for API evolution and maintenance.