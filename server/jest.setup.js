/**
 * Jest Setup File
 * Global test configuration and utilities
 */

const mysql = require('mysql2/promise');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Global test utilities
global.testUtils = {
  // Database connection pool for testing
  dbPool: null,
  
  // MongoDB memory server
  mongoServer: null,
  
  // Test data generators
  generateTestData: {
    patient: (overrides = {}) => ({
      id: Math.floor(Math.random() * 10000),
      firstName: 'Test',
      lastName: 'Patient',
      dateOfBirth: '1990-01-01',
      ssn: '123-45-6789',
      email: 'test@example.com',
      phone: '555-0123',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      insuranceId: 'INS123456',
      ...overrides
    }),
    
    claim: (overrides = {}) => ({
      id: Math.floor(Math.random() * 10000),
      patientId: 1,
      providerId: 1,
      claimNumber: `CLM${Date.now()}`,
      serviceDate: new Date().toISOString().split('T')[0],
      totalAmount: 150.00,
      status: 'submitted',
      diagnosis: 'Z00.00',
      procedure: '99213',
      ...overrides
    }),
    
    payment: (overrides = {}) => ({
      id: Math.floor(Math.random() * 10000),
      claimId: 1,
      amount: 150.00,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'insurance',
      status: 'completed',
      transactionId: `TXN${Date.now()}`,
      ...overrides
    }),
    
    arAccount: (overrides = {}) => ({
      id: Math.floor(Math.random() * 10000),
      patientId: 1,
      balance: 500.00,
      daysInAR: 45,
      lastPaymentDate: '2023-01-01',
      status: 'active',
      ...overrides
    })
  },
  
  // Database helpers
  async setupTestDatabase() {
    // Create test database connection
    this.dbPool = mysql.createPool({
      host: process.env.TEST_DB_HOST || 'localhost',
      user: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: process.env.TEST_DB_NAME || 'test_rcm',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Setup test tables
    await this.createTestTables();
  },
  
  async createTestTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS test_patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(50),
        lastName VARCHAR(50),
        dateOfBirth DATE,
        ssn VARCHAR(11),
        email VARCHAR(100),
        phone VARCHAR(20),
        address VARCHAR(200),
        city VARCHAR(50),
        state VARCHAR(2),
        zipCode VARCHAR(10),
        insuranceId VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS test_claims (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT,
        providerId INT,
        claimNumber VARCHAR(50),
        serviceDate DATE,
        totalAmount DECIMAL(10,2),
        status VARCHAR(20),
        diagnosis VARCHAR(10),
        procedure VARCHAR(10),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES test_patients(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS test_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        claimId INT,
        amount DECIMAL(10,2),
        paymentDate DATE,
        paymentMethod VARCHAR(20),
        status VARCHAR(20),
        transactionId VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (claimId) REFERENCES test_claims(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS test_ar_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT,
        balance DECIMAL(10,2),
        daysInAR INT,
        lastPaymentDate DATE,
        status VARCHAR(20),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES test_patients(id)
      )`
    ];
    
    for (const table of tables) {
      await this.dbPool.execute(table);
    }
  },
  
  async cleanupTestDatabase() {
    if (this.dbPool) {
      // Clean up test data
      const tables = ['test_payments', 'test_claims', 'test_ar_accounts', 'test_patients'];
      for (const table of tables) {
        await this.dbPool.execute(`DELETE FROM ${table}`);
      }
      
      // Close connection
      await this.dbPool.end();
    }
  },
  
  async setupMongoMemoryServer() {
    this.mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = this.mongoServer.getUri();
  },
  
  async cleanupMongoMemoryServer() {
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  },
  
  // Mock helpers
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { id: 1, role: 'admin' },
    ...overrides
  }),
  
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },
  
  mockNext: () => jest.fn(),
  
  // Assertion helpers
  expectValidResponse: (response, expectedStatus = 200) => {
    expect(response.status).toHaveBeenCalledWith(expectedStatus);
    expect(response.json).toHaveBeenCalled();
  },
  
  expectErrorResponse: (response, expectedStatus = 500) => {
    expect(response.status).toHaveBeenCalledWith(expectedStatus);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String)
      })
    );
  },
  
  // Time helpers
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Random data generators
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  randomNumber: (min = 1, max = 1000) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  randomDate: (start = new Date(2020, 0, 1), end = new Date()) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
};

// Global setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  
  // Setup test database
  await global.testUtils.setupTestDatabase();
  
  // Setup MongoDB memory server if needed
  if (process.env.USE_MONGODB === 'true') {
    await global.testUtils.setupMongoMemoryServer();
  }
});

// Global cleanup
afterAll(async () => {
  await global.testUtils.cleanupTestDatabase();
  
  if (global.testUtils.mongoServer) {
    await global.testUtils.cleanupMongoMemoryServer();
  }
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset modules
  jest.resetModules();
});

// Cleanup after each test
afterEach(async () => {
  // Clean up any test data created during the test
  if (global.testUtils.dbPool) {
    const tables = ['test_payments', 'test_claims', 'test_ar_accounts', 'test_patients'];
    for (const table of tables) {
      await global.testUtils.dbPool.execute(`DELETE FROM ${table}`);
    }
  }
});

// Console override for cleaner test output
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('Warning: ReactDOM.render is no longer supported')) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});