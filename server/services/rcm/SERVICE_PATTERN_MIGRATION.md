# RCM Service Pattern Migration Guide

## Overview

The RCM module has been refactored to use a service pattern architecture that separates business logic from HTTP request handling. This provides better maintainability, testability, and code organization.

## Architecture Changes

### Before (Old Pattern)
```
Request → Controller (with business logic) → Database → Response
```

### After (New Pattern)
```
Request → Controller (HTTP handling) → Service (business logic) → Database → Response
```

## File Structure

```
server/services/rcm/
├── rcmService.js          # Main service class with business logic
├── rcmController.js       # New service-based controller
├── rcmCtrl.js            # Legacy controller (delegated to new controller)
├── rcmRoutes.js          # Updated routes using new controller
└── SERVICE_PATTERN_MIGRATION.md
```

## Key Components

### 1. RCMService Class (`rcmService.js`)

The main service class that contains all business logic:

```javascript
class RCMService {
  async getDashboardData(options = {}) {
    // Business logic for dashboard data
  }
  
  async getClaimsStatus(options = {}) {
    // Business logic for claims status
  }
  
  // ... other service methods
}
```

**Features:**
- Pure business logic without HTTP concerns
- Standardized error handling with operational errors
- Consistent parameter handling
- Database abstraction using utility functions
- Comprehensive data formatting and validation

### 2. New Controller (`rcmController.js`)

Uses the `controllerWrapper` utility for standardized HTTP handling:

```javascript
const controllerMappings = {
  getDashboardData: {
    serviceMethod: 'getDashboardData',
    options: {
      extractParams: ParamExtractors.dashboardParams,
      transformResponse: ResponseTransformers.dashboardTransformer,
      successMessage: 'Dashboard data retrieved successfully'
    }
  }
};

const rcmController = createController(rcmService, controllerMappings);
```

**Features:**
- Automatic parameter extraction from requests
- Input validation using configurable validators
- Response transformation for consistent API format
- Standardized error handling
- Pagination support

### 3. Legacy Controller (`rcmCtrl.js`)

Maintains backward compatibility by delegating to the new controller:

```javascript
const getRCMDashboardData = rcmController.getDashboardData;
const getClaimsStatus = rcmController.getClaimsStatus;
// ... other delegated methods
```

## Migration Status

### ✅ Migrated Functions
- `getRCMDashboardData` → `rcmController.getDashboardData`
- `getClaimsStatus` → `rcmController.getClaimsStatus`
- `getARAgingReport` → `rcmController.getARAgingReport`
- `getDenialAnalytics` → `rcmController.getDenialAnalytics`
- `updateClaimStatus` → `rcmController.updateClaimStatus`
- `bulkClaimStatusUpdate` → `rcmController.bulkUpdateClaimStatus`
- `getClaimDetails` → `rcmController.getClaimDetails`
- `generateRCMReport` → `rcmController.generateRCMReport`

### 🔄 Pending Migration
- `getPaymentPostingData`
- `getRevenueForecasting`
- `getCollectionsWorkflow`
- `processERAFile`
- `updateCollectionStatus`
- `getRCMAnalytics`
- `getPayerPerformance`
- `getDenialTrends`
- `getARAccountDetails`
- `initiateAutomatedFollowUp`
- `setupPaymentPlan`
- `getClaimMDStatus`
- `syncClaimMDData`

## Usage Examples

### Using the Service Directly

```javascript
const RCMService = require('./rcmService');
const rcmService = new RCMService();

// Get dashboard data
const dashboardData = await rcmService.getDashboardData({
  timeframe: '30d',
  userId: 123
});

// Get claims with pagination
const claimsData = await rcmService.getClaimsStatus({
  page: 1,
  limit: 10,
  status: 'submitted',
  search: 'patient name'
});
```

### Using the Controller in Routes

```javascript
const rcmController = require('./rcmController');

// Simple delegation
router.get('/dashboard', rcmController.getDashboardData);

// With validation middleware
router.get('/claims',
  ValidationMiddleware.validateGetClaimsQuery,
  rcmController.getClaimsStatus
);
```

### Creating Custom Controllers

```javascript
const { createController, ParamExtractors } = require('../../utils/controllerWrapper');

const customMappings = {
  getCustomData: {
    serviceMethod: 'getCustomData',
    options: {
      extractParams: (req) => ({
        customParam: req.query.custom,
        userId: req.user?.user_id
      }),
      successMessage: 'Custom data retrieved successfully'
    }
  }
};

const customController = createController(serviceInstance, customMappings);
```

## Benefits of the New Pattern

### 1. Separation of Concerns
- **Controllers**: Handle HTTP requests/responses, validation, authentication
- **Services**: Handle business logic, data processing, external integrations
- **Utilities**: Handle common operations like database queries, formatting

### 2. Improved Testability
- Service methods can be unit tested without HTTP mocking
- Controllers use standardized patterns that are easier to test
- Clear separation makes integration testing more focused

### 3. Better Error Handling
- Operational errors are properly categorized and handled
- Consistent error responses across all endpoints
- Proper error logging and context preservation

### 4. Code Reusability
- Service methods can be reused across different controllers
- Common patterns are extracted into utilities
- Business logic is decoupled from HTTP transport

### 5. Maintainability
- Changes to business logic only affect service layer
- HTTP handling changes only affect controller layer
- Clear interfaces between layers

## Migration Guidelines

### For New Features
1. Add business logic to `RCMService` class
2. Create controller mapping in `rcmController.js`
3. Add route in `rcmRoutes.js` using new controller
4. Write tests for service methods

### For Existing Features
1. Extract business logic from old controller to service
2. Create service method with proper error handling
3. Update controller mapping
4. Update routes to use new controller
5. Add backward compatibility in legacy controller if needed

### Testing Strategy
1. **Unit Tests**: Test service methods with various inputs
2. **Integration Tests**: Test controller endpoints with HTTP requests
3. **Regression Tests**: Ensure existing functionality works unchanged

## Error Handling

### Service Layer Errors
```javascript
const { createDatabaseError, createNotFoundError } = require('../../middleware/errorHandler');

// In service method
if (!claim) {
  throw createNotFoundError('Claim not found');
}

if (dbError) {
  throw createDatabaseError('Failed to fetch claims', {
    originalError: dbError.message,
    context: { userId, filters }
  });
}
```

### Controller Layer Errors
```javascript
// Automatic error handling in controller wrapper
try {
  const result = await serviceMethod(params);
  res.json(APIResponse.success(result, successMessage));
} catch (error) {
  handleControllerError(error, res, 'Operation context');
}
```

## Performance Considerations

### Database Optimization
- Use `executeQuery` and `executeTransaction` utilities
- Implement proper connection pooling
- Add query performance monitoring

### Response Optimization
- Use response transformers for consistent formatting
- Implement pagination for large datasets
- Add caching where appropriate

### Memory Management
- Service instances are reused across requests
- Proper cleanup in transaction handlers
- Avoid memory leaks in long-running operations

## Future Enhancements

1. **Caching Layer**: Add Redis caching for frequently accessed data
2. **Event System**: Implement event-driven architecture for complex workflows
3. **Microservices**: Split large services into smaller, focused services
4. **GraphQL**: Add GraphQL layer on top of services
5. **Real-time Updates**: Add WebSocket support for real-time data updates

## Troubleshooting

### Common Issues

1. **Service Method Not Found**
   - Check method name in service class
   - Verify controller mapping configuration

2. **Parameter Extraction Issues**
   - Check `ParamExtractors` configuration
   - Verify request parameter names

3. **Validation Errors**
   - Check `InputValidators` configuration
   - Verify validation middleware setup

4. **Response Format Issues**
   - Check `ResponseTransformers` configuration
   - Verify API response structure

### Debugging Tips

1. Enable detailed logging in service methods
2. Use debugger breakpoints in controller wrapper
3. Check error context in error handler
4. Verify database query execution logs

## Support

For questions or issues with the service pattern migration:

1. Check this documentation first
2. Review existing service implementations
3. Check controller wrapper utilities
4. Consult with the development team