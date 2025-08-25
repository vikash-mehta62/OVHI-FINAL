# RCM API Documentation

## Overview

The RCM (Revenue Cycle Management) API provides comprehensive healthcare billing and claims management capabilities. This RESTful API enables healthcare providers to manage the complete revenue cycle from patient registration through payment collection.

## Base URL

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.rcm-system.com/v1`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "provider"
    }
  }
}
```

## Rate Limiting

API requests are rate limited to ensure fair usage:

- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes  
- **Create operations**: 10 requests per minute
- **Search operations**: 30 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per time window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets

## Error Handling

The API returns standardized error responses with appropriate HTTP status codes:

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Pagination

List endpoints support pagination with the following parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

### Pagination Response

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## API Endpoints

### Authentication

#### Login
```http
POST /auth/login
```

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "provider",
      "isActive": true
    }
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
```

Refresh an expired JWT token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

#### Logout
```http
POST /auth/logout
```

Invalidate the current JWT token.

### Claims Management

#### Get Claims List
```http
GET /rcm/claims?page=1&limit=20&status=pending
```

Retrieve a paginated list of claims with optional filtering.

**Query Parameters:**
- `page` (integer) - Page number
- `limit` (integer) - Items per page (max 100)
- `status` (string) - Filter by status: `pending`, `approved`, `denied`, `paid`, `cancelled`
- `patientId` (string) - Filter by patient ID
- `providerId` (string) - Filter by provider ID
- `startDate` (date) - Filter claims from this date (YYYY-MM-DD)
- `endDate` (date) - Filter claims until this date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "claims": [
      {
        "id": "claim_123",
        "claimNumber": "CLM-2023-001234",
        "patientId": "patient_456",
        "providerId": "provider_789",
        "status": "pending",
        "serviceDate": "2023-12-01",
        "submissionDate": "2023-12-02T10:30:00Z",
        "totalAmount": 150.00,
        "paidAmount": 0.00,
        "balanceAmount": 150.00,
        "diagnosis": [
          {
            "code": "Z00.00",
            "description": "Encounter for general adult medical examination without abnormal findings"
          }
        ],
        "procedures": [
          {
            "code": "99213",
            "description": "Office or other outpatient visit",
            "amount": 150.00
          }
        ],
        "insurance": {
          "primary": {
            "name": "Blue Cross Blue Shield",
            "policyNumber": "BCBS123456789",
            "subscriberId": "SUB123456"
          }
        },
        "createdAt": "2023-12-02T10:30:00Z",
        "updatedAt": "2023-12-02T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Create New Claim
```http
POST /rcm/claims
```

Create a new insurance claim.

**Request Body:**
```json
{
  "patientId": "patient_456",
  "providerId": "provider_789",
  "serviceDate": "2023-12-01",
  "totalAmount": 150.00,
  "diagnosis": [
    {
      "code": "Z00.00",
      "description": "Encounter for general adult medical examination"
    }
  ],
  "procedures": [
    {
      "code": "99213",
      "description": "Office or other outpatient visit",
      "amount": 150.00
    }
  ],
  "insurance": {
    "primary": {
      "name": "Blue Cross Blue Shield",
      "policyNumber": "BCBS123456789",
      "subscriberId": "SUB123456",
      "relationship": "self"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "claim_123",
    "claimNumber": "CLM-2023-001234",
    "status": "pending",
    // ... full claim object
  }
}
```

#### Get Claim by ID
```http
GET /rcm/claims/{claimId}
```

Retrieve detailed information about a specific claim.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "claim_123",
    "claimNumber": "CLM-2023-001234",
    // ... full claim object with all details
  }
}
```

#### Update Claim
```http
PUT /rcm/claims/{claimId}
```

Update an existing claim.

**Request Body:**
```json
{
  "status": "approved",
  "totalAmount": 175.00,
  "procedures": [
    {
      "code": "99213",
      "description": "Office or other outpatient visit",
      "amount": 175.00
    }
  ]
}
```

#### Delete Claim
```http
DELETE /rcm/claims/{claimId}
```

Delete a claim (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Claim deleted successfully"
}
```

### Payment Management

#### Get Payments List
```http
GET /rcm/payments?page=1&limit=20&claimId=claim_123
```

Retrieve a paginated list of payments.

**Query Parameters:**
- `page` (integer) - Page number
- `limit` (integer) - Items per page
- `claimId` (string) - Filter by claim ID
- `paymentMethod` (string) - Filter by payment method: `insurance`, `patient`, `adjustment`, `refund`
- `startDate` (date) - Filter payments from this date
- `endDate` (date) - Filter payments until this date

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "payment_123",
        "claimId": "claim_456",
        "amount": 120.00,
        "paymentMethod": "insurance",
        "paymentDate": "2023-12-15",
        "referenceNumber": "REF123456",
        "notes": "Primary insurance payment",
        "createdAt": "2023-12-15T14:30:00Z",
        "updatedAt": "2023-12-15T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 75,
      "totalPages": 4,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Process Payment
```http
POST /rcm/payments
```

Process a payment for a claim.

**Request Body:**
```json
{
  "claimId": "claim_456",
  "amount": 120.00,
  "paymentMethod": "insurance",
  "paymentDate": "2023-12-15",
  "referenceNumber": "REF123456",
  "notes": "Primary insurance payment"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment_123",
    "claimId": "claim_456",
    "amount": 120.00,
    "paymentMethod": "insurance",
    "paymentDate": "2023-12-15",
    "referenceNumber": "REF123456",
    "notes": "Primary insurance payment",
    "createdAt": "2023-12-15T14:30:00Z",
    "updatedAt": "2023-12-15T14:30:00Z"
  }
}
```

### Dashboard and Analytics

#### Get Dashboard Data
```http
GET /rcm/dashboard?startDate=2023-01-01&endDate=2023-12-31
```

Retrieve comprehensive dashboard data including KPIs and charts.

**Query Parameters:**
- `startDate` (date) - Start date for data range
- `endDate` (date) - End date for data range
- `providerId` (string) - Filter by provider ID

**Response:**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalRevenue": 150000.00,
      "totalClaims": 500,
      "pendingClaims": 50,
      "deniedClaims": 25,
      "collectionRate": 85.5,
      "averageReimbursement": 300.00,
      "daysInAR": 45.2
    },
    "charts": {
      "revenueByMonth": [
        {
          "month": "2023-01",
          "revenue": 12000.00
        },
        {
          "month": "2023-02",
          "revenue": 13500.00
        }
      ],
      "claimsByStatus": [
        {
          "status": "approved",
          "count": 400,
          "percentage": 80.0
        },
        {
          "status": "pending",
          "count": 50,
          "percentage": 10.0
        },
        {
          "status": "denied",
          "count": 25,
          "percentage": 5.0
        }
      ],
      "topDenialReasons": [
        {
          "reason": "Missing documentation",
          "count": 15,
          "percentage": 60.0
        },
        {
          "reason": "Invalid procedure code",
          "count": 6,
          "percentage": 24.0
        }
      ],
      "paymentMethods": [
        {
          "method": "insurance",
          "amount": 120000.00,
          "percentage": 80.0
        },
        {
          "method": "patient",
          "amount": 30000.00,
          "percentage": 20.0
        }
      ]
    }
  }
}
```

#### Get A/R Aging Data
```http
GET /rcm/ar-aging?providerId=provider_789&asOfDate=2023-12-31
```

Retrieve accounts receivable aging analysis.

**Query Parameters:**
- `providerId` (string) - Filter by provider ID
- `asOfDate` (date) - A/R aging as of specific date

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalBalance": 50000.00,
      "totalClaims": 200,
      "averageDaysOutstanding": 42.5
    },
    "buckets": {
      "0-30": {
        "amount": 20000.00,
        "count": 80,
        "percentage": 40.0
      },
      "31-60": {
        "amount": 15000.00,
        "count": 60,
        "percentage": 30.0
      },
      "61-90": {
        "amount": 10000.00,
        "count": 40,
        "percentage": 20.0
      },
      "90+": {
        "amount": 5000.00,
        "count": 20,
        "percentage": 10.0
      }
    },
    "details": [
      {
        "claimId": "claim_123",
        "claimNumber": "CLM-2023-001234",
        "patientName": "John Doe",
        "balance": 150.00,
        "daysOutstanding": 45,
        "bucket": "31-60"
      }
    ]
  }
}
```

### System Monitoring

#### Health Check
```http
GET /monitoring/health
```

Check system health status (no authentication required).

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-12-15T10:30:00Z",
    "healthScore": 95,
    "uptime": 86400000,
    "components": {
      "database": {
        "status": "healthy",
        "responseTime": 25,
        "message": "Database responding normally"
      },
      "memory": {
        "status": "healthy",
        "responseTime": 5,
        "message": "Memory usage normal"
      },
      "api": {
        "status": "healthy",
        "responseTime": 15,
        "message": "API performance normal"
      }
    }
  }
}
```

## Data Models

### Claim Object

```json
{
  "id": "claim_123",
  "claimNumber": "CLM-2023-001234",
  "patientId": "patient_456",
  "providerId": "provider_789",
  "status": "pending|approved|denied|paid|cancelled",
  "serviceDate": "2023-12-01",
  "submissionDate": "2023-12-02T10:30:00Z",
  "totalAmount": 150.00,
  "paidAmount": 120.00,
  "balanceAmount": 30.00,
  "diagnosis": [
    {
      "code": "Z00.00",
      "description": "Encounter for general adult medical examination"
    }
  ],
  "procedures": [
    {
      "code": "99213",
      "description": "Office or other outpatient visit",
      "amount": 150.00
    }
  ],
  "insurance": {
    "primary": {
      "id": "insurance_123",
      "name": "Blue Cross Blue Shield",
      "policyNumber": "BCBS123456789",
      "groupNumber": "GRP001",
      "subscriberId": "SUB123456",
      "relationship": "self"
    },
    "secondary": {
      // Secondary insurance details (optional)
    }
  },
  "createdAt": "2023-12-02T10:30:00Z",
  "updatedAt": "2023-12-02T10:30:00Z"
}
```

### Payment Object

```json
{
  "id": "payment_123",
  "claimId": "claim_456",
  "amount": 120.00,
  "paymentMethod": "insurance|patient|adjustment|refund",
  "paymentDate": "2023-12-15",
  "referenceNumber": "REF123456",
  "notes": "Primary insurance payment",
  "createdAt": "2023-12-15T14:30:00Z",
  "updatedAt": "2023-12-15T14:30:00Z"
}
```

### User Object

```json
{
  "id": "user_123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "admin|provider|billing|user",
  "isActive": true,
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-12-15T10:30:00Z"
}
```

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';

// Login and get token
async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    
    authToken = response.data.data.token;
    return response.data.data.user;
  } catch (error) {
    console.error('Login failed:', error.response.data);
    throw error;
  }
}

// Get claims with authentication
async function getClaims(filters = {}) {
  try {
    const response = await axios.get(`${API_BASE_URL}/rcm/claims`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: filters
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Failed to get claims:', error.response.data);
    throw error;
  }
}

// Create a new claim
async function createClaim(claimData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/rcm/claims`, claimData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Failed to create claim:', error.response.data);
    throw error;
  }
}

// Usage example
async function example() {
  try {
    // Login
    const user = await login('user@example.com', 'password123');
    console.log('Logged in as:', user.email);
    
    // Get pending claims
    const claims = await getClaims({ status: 'pending', limit: 10 });
    console.log('Pending claims:', claims.claims.length);
    
    // Create new claim
    const newClaim = await createClaim({
      patientId: 'patient_456',
      providerId: 'provider_789',
      serviceDate: '2023-12-01',
      totalAmount: 150.00,
      diagnosis: [
        {
          code: 'Z00.00',
          description: 'General examination'
        }
      ],
      procedures: [
        {
          code: '99213',
          description: 'Office visit',
          amount: 150.00
        }
      ]
    });
    
    console.log('Created claim:', newClaim.claimNumber);
    
  } catch (error) {
    console.error('Example failed:', error.message);
  }
}
```

### Python

```python
import requests
import json

class RCMClient:
    def __init__(self, base_url='http://localhost:3000/api/v1'):
        self.base_url = base_url
        self.token = None
        self.session = requests.Session()
    
    def login(self, email, password):
        """Login and store authentication token"""
        response = self.session.post(f'{self.base_url}/auth/login', json={
            'email': email,
            'password': password
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['data']['token']
            self.session.headers.update({
                'Authorization': f'Bearer {self.token}'
            })
            return data['data']['user']
        else:
            raise Exception(f'Login failed: {response.json()}')
    
    def get_claims(self, **filters):
        """Get claims with optional filters"""
        response = self.session.get(f'{self.base_url}/rcm/claims', params=filters)
        
        if response.status_code == 200:
            return response.json()['data']
        else:
            raise Exception(f'Failed to get claims: {response.json()}')
    
    def create_claim(self, claim_data):
        """Create a new claim"""
        response = self.session.post(f'{self.base_url}/rcm/claims', json=claim_data)
        
        if response.status_code == 201:
            return response.json()['data']
        else:
            raise Exception(f'Failed to create claim: {response.json()}')

# Usage example
client = RCMClient()

try:
    # Login
    user = client.login('user@example.com', 'password123')
    print(f'Logged in as: {user["email"]}')
    
    # Get pending claims
    claims_data = client.get_claims(status='pending', limit=10)
    print(f'Pending claims: {len(claims_data["claims"])}')
    
    # Create new claim
    new_claim = client.create_claim({
        'patientId': 'patient_456',
        'providerId': 'provider_789',
        'serviceDate': '2023-12-01',
        'totalAmount': 150.00,
        'diagnosis': [
            {
                'code': 'Z00.00',
                'description': 'General examination'
            }
        ],
        'procedures': [
            {
                'code': '99213',
                'description': 'Office visit',
                'amount': 150.00
            }
        ]
    })
    
    print(f'Created claim: {new_claim["claimNumber"]}')
    
except Exception as e:
    print(f'Error: {e}')
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Get claims (replace TOKEN with actual token)
curl -X GET "http://localhost:3000/api/v1/rcm/claims?status=pending&limit=10" \
  -H "Authorization: Bearer TOKEN"

# Create claim
curl -X POST http://localhost:3000/api/v1/rcm/claims \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_456",
    "providerId": "provider_789",
    "serviceDate": "2023-12-01",
    "totalAmount": 150.00,
    "diagnosis": [
      {
        "code": "Z00.00",
        "description": "General examination"
      }
    ],
    "procedures": [
      {
        "code": "99213",
        "description": "Office visit",
        "amount": 150.00
      }
    ]
  }'

# Get dashboard data
curl -X GET "http://localhost:3000/api/v1/rcm/dashboard?startDate=2023-01-01&endDate=2023-12-31" \
  -H "Authorization: Bearer TOKEN"

# Health check (no auth required)
curl -X GET http://localhost:3000/api/v1/monitoring/health
```

## Best Practices

### Authentication
- Always include the JWT token in the Authorization header
- Refresh tokens before they expire
- Store tokens securely (not in localStorage for web apps)
- Implement proper logout functionality

### Error Handling
- Always check the `success` field in responses
- Handle different HTTP status codes appropriately
- Implement retry logic for transient errors (5xx)
- Log errors for debugging

### Rate Limiting
- Implement exponential backoff for rate limit errors
- Monitor rate limit headers to avoid hitting limits
- Cache responses when appropriate to reduce API calls

### Data Validation
- Validate data on the client side before sending requests
- Handle validation errors returned by the API
- Use proper data types (dates, numbers, etc.)

### Performance
- Use pagination for large datasets
- Implement caching for frequently accessed data
- Use appropriate filters to reduce response sizes
- Consider using compression for large requests

## Support

For API support and questions:
- Email: api-support@rcm-system.com
- Documentation: https://docs.rcm-system.com
- Status Page: https://status.rcm-system.com

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Claims management endpoints
- Payment processing endpoints
- Dashboard and analytics endpoints
- Authentication and authorization
- Rate limiting and security features