# Comprehensive Backend Testing Guide

## Overview

This guide covers the comprehensive testing strategy implemented for the RCM (Revenue Cycle Management) backend system. The testing suite includes unit tests, integration tests, performance tests, and end-to-end API tests.

## Test Structure

```
server/
├── __tests__/
│   ├── setup.test.js                 # Test environment setup
│   ├── integration/
│   │   └── rcm-api.test.js          # API integration tests
│   └── performance/
│       └── rcm-performance.test.js   # Performance and load tests
├── services/rcm/__tests__/
│   ├── rcmService.test.js           # Service layer unit tests
│   ├── rcmController.test.js        # Controller unit tests
│   ├── rcmRoutes.test.js           # Route configuration tests
│   ├── consolidatedRCMService.test.js # Consolidated service tests
│   ├── errorHandling.test.js        # Error handling tests
│   ├── transactionHandling.test.js  # Transaction tests
│   └── rcmIntegration.test.js      # Service integration tests
├── middleware/__tests__/
│   ├── auth.test.js                # Authentication middleware tests
│   ├── validation.test.js          # Validation middleware tests
│   └── errorHandler.test.js        # Error handler middleware tests
├── utils/__tests__/
│   ├── dbUtils.test.js             # Database utility tests
│   ├── rcmUtils.test.js            # RCM utility tests
│   └── transactionManager.test.js  # Transaction manager tests
├── jest.config.js                  # Jest configuration
├── jest.setup.js                   # Jest setup file
└── test-runner.js                  # Custom test runner
```

## Test Categories

### 1. Unit Tests
- **Purpose**: Test individual functions and methods in isolation
- **Coverage**: Services, controllers, utilities, middleware
- **Mocking**: External dependencies are mocked
- **Speed**: Fast execution (< 10ms per test)

### 2. Integration Tests
- **Purpose**: Test component interactions and API endpoints
- **Coverage**: Full request/response cycles, database interactions
- **Mocking**: Minimal mocking, real component integration
- **Speed**: Moderate execution (< 100ms per test)

### 3. Performance Tests
- **Purpose**: Validate system performance under load
- **Coverage**: Database queries, concurrent operations, memory usage
- **Metrics**: Response time, throughput, resource utilization
- **Speed**: Slower execution (up to 60s for full suite)

### 4. End-to-End Tests
- **Purpose**: Test complete user workflows
- **Coverage**: Authentication, CRUD operations, business logic
- **Environment**: Test database with realistic data
- **Speed**: Slowest execution (up to 30s per test)

## Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:performance

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Advanced Test Runner
```bash
# Run all tests with custom runner
node test-runner.js

# Run specific suite
node test-runner.js unit
node test-runner.js integration

# Run with options
node test-runner.js --coverage --verbose
node test-runner.js --parallel --skip-performance
node test-runner.js --watch
```

### Test Runner Options
- `--coverage`: Generate code coverage reports
- `--verbose`: Detailed test output
- `--parallel`: Run test suites in parallel
- `--skip-performance`: Skip performance tests
- `--continue-on-error`: Continue running tests after failures
- `--dry-run`: Show what would be executed without running tests

## Test Configuration

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
  verbose: true
};
```

### Environment Setup
```javascript
// jest.setup.js
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'rcm_test';
process.env.JWT_SECRET = 'test_jwt_secret';

// Global test utilities
global.testUtils = {
  createMockRequest: (overrides = {}) => ({ /* mock request */ }),
  createMockResponse: () => ({ /* mock response */ }),
  createMockNext: () => jest.fn()
};
```

## Writing Tests

### Unit Test Example
```javascript
describe('RCMService', () => {
  let rcmService;

  beforeEach(() => {
    rcmService = new RCMService();
    jest.clearAllMocks();
  });

  describe('getClaims', () => {
    it('should retrieve claims with pagination', async () => {
      const mockClaims = [
        { id: 1, claimNumber: 'CLM001', status: 'pending' }
      ];
      
      dbUtils.executeQuery.mockResolvedValue(mockClaims);

      const result = await rcmService.getClaims({ page: 1, limit: 10 });

      expect(result).toEqual(mockClaims);
      expect(dbUtils.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.any(Array)
      );
    });
  });
});
```

### Integration Test Example
```javascript
describe('RCM API Integration', () => {
  let authToken;

  beforeAll(async () => {
    authToken = jwt.sign(
      { id: 'test-user', email: 'test@example.com' },
      process.env.JWT_SECRET
    );
  });

  describe('GET /api/v1/rcm/claims', () => {
    it('should retrieve claims with authentication', async () => {
      const response = await request(app)
        .get('/api/v1/rcm/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('claims');
    });
  });
});
```

### Performance Test Example
```javascript
describe('Performance Tests', () => {
  it('should handle large result sets efficiently', async () => {
    const largeDataSet = Array.from({ length: 10000 }, (_, i) => ({
      id: i + 1,
      claimNumber: `CLM${String(i + 1).padStart(5, '0')}`
    }));

    dbUtils.executeQuery.mockResolvedValue(largeDataSet);

    const startTime = process.hrtime.bigint();
    const result = await service.getClaimsWithFilters({ limit: 10000 });
    const endTime = process.hrtime.bigint();
    
    const executionTime = Number(endTime - startTime) / 1000000;

    expect(result.claims).toHaveLength(10000);
    expect(executionTime).toBeLessThan(100); // Should complete within 100ms
  });
});
```

## Mocking Strategies

### Database Mocking
```javascript
// Mock database utilities
jest.mock('../../utils/dbUtils');

beforeEach(() => {
  dbUtils.executeQuery.mockClear();
  dbUtils.getConnection.mockClear();
});

// Mock specific queries
dbUtils.executeQuery.mockImplementation((query, params) => {
  if (query.includes('SELECT')) {
    return Promise.resolve([{ id: 1, data: 'test' }]);
  }
  return Promise.resolve({ insertId: 1, affectedRows: 1 });
});
```

### Authentication Mocking
```javascript
// Mock authentication middleware
jest.mock('../../../middleware/auth');

authMiddleware.mockImplementation((req, res, next) => {
  req.user = { id: 'test-user', role: 'admin' };
  next();
});
```

### External Service Mocking
```javascript
// Mock external APIs
jest.mock('axios');

axios.get.mockResolvedValue({
  data: { success: true, result: 'mocked response' }
});
```

## Coverage Requirements

### Minimum Coverage Targets
- **Overall Coverage**: 85%
- **Functions**: 90%
- **Lines**: 85%
- **Branches**: 80%
- **Statements**: 85%

### Critical Components (95% Coverage Required)
- Authentication middleware
- Payment processing
- Transaction management
- Error handling
- Data validation

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html

# View coverage summary
npm run test:coverage -- --verbose
```

## Continuous Integration

### GitHub Actions Configuration
```yaml
name: Backend Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v1
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

## Performance Benchmarks

### Response Time Targets
- **Simple Queries**: < 50ms
- **Complex Queries**: < 200ms
- **Bulk Operations**: < 500ms
- **API Endpoints**: < 100ms

### Throughput Targets
- **Concurrent Reads**: 100+ requests/second
- **Concurrent Writes**: 50+ requests/second
- **Database Connections**: 20+ concurrent connections

### Memory Usage Targets
- **Memory Leaks**: None detected
- **Peak Memory**: < 512MB for test suite
- **Garbage Collection**: < 10% of execution time

## Debugging Tests

### Debug Mode
```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand specific.test.js
```

### Logging
```javascript
// Enable debug logging in tests
process.env.DEBUG = 'rcm:*';

// Use console.log for debugging (mocked by default)
console.log = jest.fn(); // Mock
console.log.mockRestore(); // Restore for debugging
```

### Test Data Inspection
```javascript
// Save test data for inspection
afterEach(() => {
  if (process.env.SAVE_TEST_DATA) {
    fs.writeFileSync('test-data.json', JSON.stringify(testData, null, 2));
  }
});
```

## Best Practices

### Test Organization
1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the expected behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests independent** and isolated
5. **Use setup and teardown** hooks appropriately

### Test Data Management
1. **Use factories** for creating test data
2. **Avoid hardcoded values** where possible
3. **Clean up test data** after each test
4. **Use realistic data** that matches production patterns

### Assertion Guidelines
1. **Be specific** with assertions
2. **Test both positive and negative cases**
3. **Verify error conditions** and edge cases
4. **Check side effects** and state changes

### Performance Testing
1. **Set realistic benchmarks** based on production requirements
2. **Test with realistic data volumes**
3. **Monitor resource usage** during tests
4. **Test concurrent operations**

## Troubleshooting

### Common Issues

#### Tests Timing Out
```javascript
// Increase timeout for specific tests
jest.setTimeout(30000);

// Or in test file
describe('Slow tests', () => {
  jest.setTimeout(60000);
  
  it('should handle large operations', async () => {
    // Long-running test
  });
});
```

#### Memory Issues
```javascript
// Force garbage collection
if (global.gc) {
  global.gc();
}

// Monitor memory usage
const memUsage = process.memoryUsage();
console.log('Memory usage:', memUsage);
```

#### Database Connection Issues
```javascript
// Ensure proper cleanup
afterEach(async () => {
  await dbUtils.closeAllConnections();
});

// Mock database errors
dbUtils.executeQuery.mockRejectedValue(new Error('Connection failed'));
```

### Getting Help

1. **Check test logs** for detailed error messages
2. **Review coverage reports** to identify untested code
3. **Use debug mode** to step through failing tests
4. **Consult team documentation** for project-specific patterns
5. **Ask for code review** on complex test scenarios

## Maintenance

### Regular Tasks
1. **Update test dependencies** monthly
2. **Review and update benchmarks** quarterly
3. **Refactor tests** when code changes
4. **Monitor test execution time** and optimize slow tests
5. **Update documentation** when adding new test patterns

### Test Health Monitoring
1. **Track test execution time** trends
2. **Monitor flaky tests** and fix them promptly
3. **Review coverage reports** regularly
4. **Update test data** to match production changes
5. **Validate performance benchmarks** against production metrics