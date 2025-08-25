# RCM Module Coding Standards Guide

This document outlines the coding standards, conventions, and best practices for the RCM (Revenue Cycle Management) module development.

## Table of Contents

1. [General Principles](#general-principles)
2. [File Organization](#file-organization)
3. [Naming Conventions](#naming-conventions)
4. [Code Structure](#code-structure)
5. [Frontend Standards](#frontend-standards)
6. [Backend Standards](#backend-standards)
7. [Database Standards](#database-standards)
8. [Testing Standards](#testing-standards)
9. [Documentation Standards](#documentation-standards)
10. [Security Standards](#security-standards)

## General Principles

### Code Quality Principles

1. **Readability First**: Code should be self-documenting and easy to understand
2. **Consistency**: Follow established patterns throughout the codebase
3. **Modularity**: Write small, focused functions and components
4. **DRY (Don't Repeat Yourself)**: Avoid code duplication
5. **SOLID Principles**: Follow object-oriented design principles
6. **Performance**: Write efficient code without premature optimization

### Code Review Standards

- All code must be reviewed before merging
- Use meaningful commit messages following conventional commits
- Ensure all tests pass before submitting PR
- Address all linting and formatting issues

## File Organization

### Directory Structure

```
src/
├── components/
│   └── rcm/
│       ├── dashboard/          # Dashboard components
│       ├── shared/            # Reusable RCM components
│       └── forms/             # Form components
├── services/
│   └── rcm/                   # API service layers
├── hooks/
│   └── rcm/                   # Custom hooks
├── utils/
│   └── rcm/                   # Utility functions
└── types/
    └── rcm/                   # TypeScript definitions

server/
├── services/
│   └── rcm/                   # Business logic
├── routes/
│   └── rcm/                   # API routes
├── middleware/                # Express middleware
├── utils/                     # Server utilities
└── __tests__/                 # Test files
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `RCMDashboard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useRCMData.ts`)
- **Services**: camelCase with suffix (e.g., `rcmService.js`)
- **Utils**: camelCase (e.g., `rcmFormatters.ts`)
- **Types**: PascalCase (e.g., `RCMTypes.ts`)
- **Tests**: Same as source with `.test` or `.spec` suffix

## Naming Conventions

### Variables and Functions

```typescript
// ✅ Good - camelCase
const claimAmount = 1000;
const calculateTotalRevenue = () => {};

// ❌ Bad - snake_case or PascalCase
const claim_amount = 1000;
const CalculateTotalRevenue = () => {};
```

### Constants

```typescript
// ✅ Good - SCREAMING_SNAKE_CASE
const MAX_CLAIM_AMOUNT = 50000;
const API_ENDPOINTS = {
  CLAIMS: '/api/v1/rcm/claims',
  PAYMENTS: '/api/v1/rcm/payments'
};

// ❌ Bad - camelCase
const maxClaimAmount = 50000;
```

### Components

```typescript
// ✅ Good - PascalCase with descriptive names
const ClaimStatusBadge = () => {};
const PaymentHistoryTable = () => {};

// ❌ Bad - Generic or unclear names
const Badge = () => {};
const Table = () => {};
```

### Types and Interfaces

```typescript
// ✅ Good - PascalCase with descriptive names
interface ClaimData {
  id: string;
  amount: number;
  status: ClaimStatus;
}

type PaymentMethod = 'credit_card' | 'bank_transfer' | 'check';

// ❌ Bad - Generic names
interface Data {
  id: string;
}
```

## Code Structure

### Function Structure

```typescript
// ✅ Good - Clear, single responsibility
const calculateClaimTotal = (
  claimItems: ClaimItem[],
  taxRate: number = 0
): number => {
  const subtotal = claimItems.reduce((sum, item) => sum + item.amount, 0);
  return subtotal * (1 + taxRate);
};

// ❌ Bad - Multiple responsibilities, unclear parameters
const calculate = (items: any[], rate?: number) => {
  // Complex logic mixing concerns
};
```

### Error Handling

```typescript
// ✅ Good - Explicit error handling
const fetchClaimData = async (claimId: string): Promise<ClaimData> => {
  try {
    const response = await api.get(`/claims/${claimId}`);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch claim data', { claimId, error });
    throw new AppError('Unable to retrieve claim information', 'CLAIM_FETCH_ERROR');
  }
};

// ❌ Bad - Silent failures or generic errors
const fetchClaimData = async (claimId: string) => {
  const response = await api.get(`/claims/${claimId}`);
  return response.data; // No error handling
};
```

## Frontend Standards

### React Component Structure

```typescript
// ✅ Good - Well-structured component
interface ClaimCardProps {
  claim: ClaimData;
  onStatusChange: (claimId: string, status: ClaimStatus) => void;
  className?: string;
}

const ClaimCard: React.FC<ClaimCardProps> = ({
  claim,
  onStatusChange,
  className = ''
}) => {
  const { formatCurrency, formatDate } = useRCMFormatters();
  
  const handleStatusChange = useCallback((newStatus: ClaimStatus) => {
    onStatusChange(claim.id, newStatus);
  }, [claim.id, onStatusChange]);

  return (
    <div className={`claim-card ${className}`}>
      <div className="claim-header">
        <h3>{claim.patientName}</h3>
        <StatusBadge status={claim.status} />
      </div>
      <div className="claim-details">
        <p>Amount: {formatCurrency(claim.amount)}</p>
        <p>Date: {formatDate(claim.createdAt)}</p>
      </div>
    </div>
  );
};

export default ClaimCard;
```

### Custom Hooks

```typescript
// ✅ Good - Focused, reusable hook
const useClaimData = (claimId: string) => {
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        setLoading(true);
        setError(null);
        const claimData = await claimService.getById(claimId);
        setClaim(claimData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (claimId) {
      fetchClaim();
    }
  }, [claimId]);

  return { claim, loading, error };
};
```

### State Management

```typescript
// ✅ Good - Redux Toolkit slice
const rcmSlice = createSlice({
  name: 'rcm',
  initialState: {
    claims: [],
    loading: false,
    error: null
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setClaims: (state, action) => {
      state.claims = action.payload;
      state.loading = false;
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});
```

## Backend Standards

### Service Layer Structure

```javascript
// ✅ Good - Service with clear separation of concerns
class RCMService {
  constructor(dbUtils, logger) {
    this.db = dbUtils;
    this.logger = logger;
  }

  async createClaim(claimData) {
    try {
      // Validate input
      const validatedData = this.validateClaimData(claimData);
      
      // Business logic
      const processedClaim = await this.processClaimData(validatedData);
      
      // Database operation
      const result = await this.db.executeTransaction(async (connection) => {
        const claimId = await this.insertClaim(connection, processedClaim);
        await this.insertClaimItems(connection, claimId, processedClaim.items);
        return claimId;
      });

      this.logger.info('Claim created successfully', { claimId: result });
      return result;
    } catch (error) {
      this.logger.error('Failed to create claim', { error, claimData });
      throw new AppError('Unable to create claim', 'CLAIM_CREATION_ERROR');
    }
  }

  validateClaimData(data) {
    // Validation logic
  }

  async processClaimData(data) {
    // Business logic
  }
}
```

### API Route Structure

```javascript
// ✅ Good - Clean route with proper middleware
router.post('/claims',
  authMiddleware,
  validateClaimData,
  async (req, res, next) => {
    try {
      const claimData = req.body;
      const userId = req.user.id;
      
      const result = await rcmService.createClaim({
        ...claimData,
        createdBy: userId
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Claim created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);
```

### Database Queries

```javascript
// ✅ Good - Parameterized queries with proper error handling
const getClaimsByStatus = async (status, limit = 50, offset = 0) => {
  const query = `
    SELECT 
      c.id,
      c.patient_name,
      c.amount,
      c.status,
      c.created_at,
      COUNT(ci.id) as item_count
    FROM claims c
    LEFT JOIN claim_items ci ON c.id = ci.claim_id
    WHERE c.status = ?
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  try {
    const [rows] = await db.execute(query, [status, limit, offset]);
    return rows;
  } catch (error) {
    logger.error('Database query failed', { query, params: [status, limit, offset], error });
    throw new DatabaseError('Failed to retrieve claims');
  }
};

// ❌ Bad - SQL injection vulnerability
const getClaimsByStatus = async (status) => {
  const query = `SELECT * FROM claims WHERE status = '${status}'`;
  return await db.query(query);
};
```

## Database Standards

### Table Naming

- Use snake_case for table and column names
- Use singular nouns for table names
- Use descriptive names that reflect the business domain

```sql
-- ✅ Good
CREATE TABLE claim (
  id VARCHAR(36) PRIMARY KEY,
  patient_name VARCHAR(255) NOT NULL,
  claim_amount DECIMAL(10,2) NOT NULL,
  claim_status ENUM('pending', 'approved', 'denied') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ❌ Bad
CREATE TABLE Claims (
  ID int,
  PatientName varchar(255),
  Amount decimal,
  Status varchar(50)
);
```

### Indexing Strategy

```sql
-- ✅ Good - Strategic indexing
CREATE INDEX idx_claim_status_created ON claim(claim_status, created_at);
CREATE INDEX idx_claim_patient ON claim(patient_name);
CREATE INDEX idx_payment_claim_id ON payment(claim_id);

-- ❌ Bad - Over-indexing or missing indexes
CREATE INDEX idx_every_column ON claim(id, patient_name, claim_amount, claim_status, created_at);
```

## Testing Standards

### Unit Test Structure

```javascript
// ✅ Good - Comprehensive test with clear structure
describe('RCMService', () => {
  let rcmService;
  let mockDb;
  let mockLogger;

  beforeEach(() => {
    mockDb = {
      executeTransaction: jest.fn(),
      execute: jest.fn()
    };
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };
    rcmService = new RCMService(mockDb, mockLogger);
  });

  describe('createClaim', () => {
    it('should create a claim successfully with valid data', async () => {
      // Arrange
      const claimData = {
        patientName: 'John Doe',
        amount: 1000,
        items: [{ description: 'Service', amount: 1000 }]
      };
      mockDb.executeTransaction.mockResolvedValue('claim-123');

      // Act
      const result = await rcmService.createClaim(claimData);

      // Assert
      expect(result).toBe('claim-123');
      expect(mockDb.executeTransaction).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Claim created successfully',
        { claimId: 'claim-123' }
      );
    });

    it('should throw AppError when validation fails', async () => {
      // Arrange
      const invalidClaimData = { patientName: '' };

      // Act & Assert
      await expect(rcmService.createClaim(invalidClaimData))
        .rejects
        .toThrow(AppError);
    });
  });
});
```

### Integration Test Structure

```javascript
// ✅ Good - Integration test with proper setup/teardown
describe('RCM API Integration', () => {
  let app;
  let testDb;

  beforeAll(async () => {
    app = await createTestApp();
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDb);
  });

  beforeEach(async () => {
    await seedTestData(testDb);
  });

  afterEach(async () => {
    await clearTestData(testDb);
  });

  describe('POST /api/v1/rcm/claims', () => {
    it('should create a new claim', async () => {
      const claimData = {
        patientName: 'John Doe',
        amount: 1000
      };

      const response = await request(app)
        .post('/api/v1/rcm/claims')
        .send(claimData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });
  });
});
```

## Documentation Standards

### Code Comments

```typescript
// ✅ Good - Meaningful comments explaining why, not what
/**
 * Calculates the adjusted claim amount based on insurance coverage
 * and patient responsibility. Applies deductibles and co-insurance
 * according to the patient's insurance plan.
 * 
 * @param claimAmount - Original claim amount
 * @param insurancePlan - Patient's insurance plan details
 * @returns Adjusted amount after insurance calculations
 */
const calculateAdjustedAmount = (
  claimAmount: number,
  insurancePlan: InsurancePlan
): number => {
  // Apply deductible first (patient pays until deductible is met)
  const afterDeductible = Math.max(0, claimAmount - insurancePlan.remainingDeductible);
  
  // Apply co-insurance to remaining amount
  const insurancePayment = afterDeductible * insurancePlan.coveragePercentage;
  
  return claimAmount - insurancePayment;
};

// ❌ Bad - Comments that just repeat the code
// Set the claim amount to 1000
const claimAmount = 1000;
```

### API Documentation

```javascript
/**
 * @swagger
 * /api/v1/rcm/claims:
 *   post:
 *     summary: Create a new claim
 *     description: Creates a new medical claim for processing
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClaimRequest'
 *     responses:
 *       201:
 *         description: Claim created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClaimResponse'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
```

## Security Standards

### Input Validation

```javascript
// ✅ Good - Comprehensive validation
const validateClaimData = (data) => {
  const schema = Joi.object({
    patientName: Joi.string().min(2).max(100).required(),
    amount: Joi.number().positive().max(100000).required(),
    description: Joi.string().max(500).required(),
    serviceDate: Joi.date().max('now').required()
  });

  const { error, value } = schema.validate(data);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }
  return value;
};

// ❌ Bad - No validation
const processClaimData = (data) => {
  // Direct use without validation
  return data;
};
```

### SQL Injection Prevention

```javascript
// ✅ Good - Parameterized queries
const getClaim = async (claimId) => {
  const query = 'SELECT * FROM claims WHERE id = ?';
  const [rows] = await db.execute(query, [claimId]);
  return rows[0];
};

// ❌ Bad - String concatenation
const getClaim = async (claimId) => {
  const query = `SELECT * FROM claims WHERE id = '${claimId}'`;
  return await db.query(query);
};
```

### Authentication and Authorization

```javascript
// ✅ Good - Proper auth middleware
const requireRCMAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.permissions.includes('rcm:read')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  next();
};
```

## Performance Standards

### Database Optimization

```javascript
// ✅ Good - Efficient query with proper indexing
const getDashboardData = async (userId, dateRange) => {
  const query = `
    SELECT 
      COUNT(*) as total_claims,
      SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
      AVG(amount) as average_claim
    FROM claims 
    WHERE created_by = ? 
      AND created_at BETWEEN ? AND ?
      AND deleted_at IS NULL
  `;
  
  return await db.execute(query, [userId, dateRange.start, dateRange.end]);
};

// ❌ Bad - N+1 query problem
const getDashboardData = async (userId) => {
  const claims = await db.execute('SELECT * FROM claims WHERE created_by = ?', [userId]);
  
  for (const claim of claims) {
    claim.items = await db.execute('SELECT * FROM claim_items WHERE claim_id = ?', [claim.id]);
  }
  
  return claims;
};
```

### Frontend Performance

```typescript
// ✅ Good - Optimized component with memoization
const ClaimsList = React.memo(({ claims, onClaimSelect }) => {
  const memoizedClaims = useMemo(() => 
    claims.map(claim => ({
      ...claim,
      formattedAmount: formatCurrency(claim.amount)
    })), 
    [claims]
  );

  return (
    <div className="claims-list">
      {memoizedClaims.map(claim => (
        <ClaimCard 
          key={claim.id} 
          claim={claim} 
          onClick={onClaimSelect}
        />
      ))}
    </div>
  );
});

// ❌ Bad - Unnecessary re-renders
const ClaimsList = ({ claims, onClaimSelect }) => {
  return (
    <div className="claims-list">
      {claims.map(claim => (
        <ClaimCard 
          key={claim.id} 
          claim={{
            ...claim,
            formattedAmount: formatCurrency(claim.amount) // Recalculated on every render
          }}
          onClick={onClaimSelect}
        />
      ))}
    </div>
  );
};
```

## Conclusion

Following these coding standards ensures:

- **Maintainable Code**: Easy to read, understand, and modify
- **Consistent Quality**: Uniform code style across the team
- **Reduced Bugs**: Proper error handling and validation
- **Better Performance**: Optimized queries and efficient algorithms
- **Security**: Protection against common vulnerabilities
- **Testability**: Code that's easy to test and debug

Remember: These standards are living guidelines that should evolve with the project and team needs. Regular code reviews and team discussions help maintain and improve these standards over time.