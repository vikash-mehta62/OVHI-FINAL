# Authentication and Authorization Guide

## Overview

The RCM API uses JWT (JSON Web Tokens) for authentication and role-based access control (RBAC) for authorization. This guide covers the complete authentication flow, token management, and permission system.

## Authentication Flow

### 1. User Login

Users authenticate by providing email and password credentials:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Successful Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfMTIzIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6InByb3ZpZGVyIiwiaWF0IjoxNjM5NTc2ODAwLCJleHAiOjE2Mzk2NjMyMDB9.signature",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "provider",
      "isActive": true,
      "permissions": [
        "claims:read",
        "claims:create",
        "claims:update",
        "payments:read",
        "payments:create"
      ]
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```

### 2. Token Usage

Include the JWT token in the Authorization header for all authenticated requests:

```http
GET /api/v1/rcm/claims
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Token Refresh

JWT tokens have a limited lifespan (default: 24 hours). Use the refresh token to get a new access token:

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token_here",
    "refreshToken": "new_refresh_token_here"
  }
}
```

### 4. Logout

Invalidate the current token and refresh token:

```http
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## JWT Token Structure

The JWT token contains the following claims:

```json
{
  "id": "user_123",
  "email": "user@example.com",
  "role": "provider",
  "permissions": [
    "claims:read",
    "claims:create",
    "payments:read"
  ],
  "iat": 1639576800,
  "exp": 1639663200
}
```

### Token Claims

- `id` - Unique user identifier
- `email` - User's email address
- `role` - User's primary role
- `permissions` - Array of specific permissions
- `iat` - Token issued at timestamp
- `exp` - Token expiration timestamp

## User Roles

The system supports the following user roles with different permission levels:

### Admin
- **Description**: System administrators with full access
- **Permissions**: All system operations
- **Typical Users**: IT administrators, system managers

```json
{
  "role": "admin",
  "permissions": [
    "*:*"
  ]
}
```

### Provider
- **Description**: Healthcare providers (doctors, nurses, etc.)
- **Permissions**: Patient care, claims management, limited billing
- **Typical Users**: Physicians, nurse practitioners, physician assistants

```json
{
  "role": "provider",
  "permissions": [
    "patients:read",
    "patients:create",
    "patients:update",
    "claims:read",
    "claims:create",
    "claims:update",
    "payments:read",
    "encounters:*",
    "dashboard:read"
  ]
}
```

### Billing
- **Description**: Billing and revenue cycle staff
- **Permissions**: Full billing operations, limited patient access
- **Typical Users**: Billing specialists, revenue cycle managers

```json
{
  "role": "billing",
  "permissions": [
    "claims:*",
    "payments:*",
    "ar-aging:*",
    "collections:*",
    "reports:billing",
    "dashboard:read",
    "patients:read"
  ]
}
```

### User
- **Description**: General users with limited access
- **Permissions**: Read-only access to assigned data
- **Typical Users**: Administrative staff, read-only users

```json
{
  "role": "user",
  "permissions": [
    "dashboard:read",
    "reports:read",
    "patients:read"
  ]
}
```

## Permission System

### Permission Format

Permissions follow the format: `resource:action`

- `resource` - The system resource (claims, payments, patients, etc.)
- `action` - The allowed action (read, create, update, delete, *)

### Available Resources

- `claims` - Insurance claims
- `payments` - Payment transactions
- `patients` - Patient information
- `providers` - Provider information
- `encounters` - Clinical encounters
- `ar-aging` - Accounts receivable aging
- `collections` - Collections activities
- `reports` - System reports
- `dashboard` - Dashboard access
- `admin` - Administrative functions
- `monitoring` - System monitoring

### Available Actions

- `read` - View/retrieve data
- `create` - Create new records
- `update` - Modify existing records
- `delete` - Remove records
- `*` - All actions on the resource

### Permission Examples

```json
{
  "permissions": [
    "claims:read",           // Can view claims
    "claims:create",         // Can create new claims
    "claims:update",         // Can update existing claims
    "payments:*",            // Can perform all payment operations
    "patients:read",         // Can view patient information
    "dashboard:read",        // Can access dashboard
    "reports:billing"        // Can access billing reports
  ]
}
```

## Authorization Middleware

### Route Protection

Routes are protected using authentication and authorization middleware:

```javascript
// Authentication required
app.use('/api/v1/rcm', authMiddleware);

// Role-based access
app.use('/api/v1/admin', roleMiddleware(['admin']));

// Permission-based access
app.use('/api/v1/rcm/claims', permissionMiddleware('claims:read'));
```

### Middleware Types

#### 1. Authentication Middleware (`authMiddleware`)
- Validates JWT token
- Extracts user information
- Adds user object to request

#### 2. Role Middleware (`roleMiddleware`)
- Checks user role against allowed roles
- Supports multiple role requirements

```javascript
// Single role
roleMiddleware(['admin'])

// Multiple roles
roleMiddleware(['admin', 'billing'])
```

#### 3. Permission Middleware (`permissionMiddleware`)
- Checks specific permissions
- Supports resource and action validation

```javascript
// Single permission
permissionMiddleware('claims:read')

// Multiple permissions (OR logic)
permissionMiddleware(['claims:read', 'claims:create'])

// Multiple permissions (AND logic)
permissionMiddleware(['claims:read', 'payments:read'], { requireAll: true })
```

## Security Features

### Token Security

1. **Secure Storage**: Tokens should be stored securely
   - Server-side: In-memory or secure cache
   - Client-side: HttpOnly cookies (recommended) or secure storage

2. **Token Rotation**: Refresh tokens are rotated on each use

3. **Token Blacklisting**: Logout invalidates tokens server-side

4. **Short Expiration**: Access tokens have short lifespans (24 hours)

### Password Security

1. **Hashing**: Passwords are hashed using bcrypt with salt rounds
2. **Complexity**: Minimum password requirements enforced
3. **Rate Limiting**: Login attempts are rate limited
4. **Account Lockout**: Multiple failed attempts lock accounts

### Session Security

1. **HTTPS Only**: Tokens should only be transmitted over HTTPS
2. **CSRF Protection**: Cross-site request forgery protection
3. **XSS Prevention**: Proper token storage prevents XSS attacks

## Implementation Examples

### JavaScript/Node.js Client

```javascript
class RCMAuthClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = null;
    this.refreshToken = null;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      this.token = data.data.token;
      this.refreshToken = data.data.refreshToken;
      return data.data.user;
    } else {
      const error = await response.json();
      throw new Error(error.error);
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (response.ok) {
      const data = await response.json();
      this.token = data.data.token;
      this.refreshToken = data.data.refreshToken;
      return this.token;
    } else {
      throw new Error('Token refresh failed');
    }
  }

  async makeAuthenticatedRequest(url, options = {}) {
    if (!this.token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`
      }
    });

    // Handle token expiration
    if (response.status === 401) {
      try {
        await this.refreshAccessToken();
        // Retry the request with new token
        return await fetch(`${this.baseURL}${url}`, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${this.token}`
          }
        });
      } catch (error) {
        throw new Error('Authentication failed');
      }
    }

    return response;
  }

  async logout() {
    if (this.token) {
      await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
    }
    
    this.token = null;
    this.refreshToken = null;
  }
}

// Usage
const client = new RCMAuthClient('http://localhost:3000/api/v1');

try {
  const user = await client.login('user@example.com', 'password123');
  console.log('Logged in as:', user.email);

  // Make authenticated request
  const response = await client.makeAuthenticatedRequest('/rcm/claims');
  const claims = await response.json();
  console.log('Claims:', claims.data);

} catch (error) {
  console.error('Authentication error:', error.message);
}
```

### React Hook Example

```javascript
import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Validate token and get user info
      validateToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.data);
      } else {
        // Token invalid, clear it
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        const { token, user } = data.data;
        
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        
        return user;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    
    // Check for wildcard permission
    if (user.permissions.includes('*:*')) return true;
    
    // Check for specific permission
    if (user.permissions.includes(permission)) return true;
    
    // Check for resource wildcard (e.g., claims:* for claims:read)
    const [resource] = permission.split(':');
    if (user.permissions.includes(`${resource}:*`)) return true;
    
    return false;
  };

  const hasRole = (role) => {
    return user && user.role === role;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    hasPermission,
    hasRole,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Usage in components
const ClaimsComponent = () => {
  const { hasPermission } = useAuth();

  if (!hasPermission('claims:read')) {
    return <div>Access denied</div>;
  }

  return (
    <div>
      <h1>Claims</h1>
      {hasPermission('claims:create') && (
        <button>Create New Claim</button>
      )}
    </div>
  );
};
```

## Error Codes

### Authentication Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `ACCOUNT_LOCKED` | 401 | Account is locked due to failed attempts |
| `ACCOUNT_DISABLED` | 401 | User account is disabled |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `TOKEN_INVALID` | 401 | JWT token is malformed or invalid |
| `TOKEN_MISSING` | 401 | Authorization header is missing |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token is invalid or expired |

### Authorization Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `ROLE_REQUIRED` | 403 | User role is not authorized |
| `RESOURCE_ACCESS_DENIED` | 403 | Access to specific resource denied |

## Best Practices

### For Developers

1. **Token Storage**
   - Use HttpOnly cookies for web applications
   - Use secure storage for mobile applications
   - Never store tokens in localStorage for production

2. **Token Handling**
   - Implement automatic token refresh
   - Handle token expiration gracefully
   - Clear tokens on logout

3. **Permission Checks**
   - Check permissions on both client and server
   - Use granular permissions for better security
   - Implement role-based UI rendering

4. **Error Handling**
   - Handle authentication errors appropriately
   - Provide clear error messages to users
   - Log security events for monitoring

### For System Administrators

1. **User Management**
   - Regularly review user permissions
   - Implement principle of least privilege
   - Monitor user activity logs

2. **Security Configuration**
   - Use strong JWT secrets (32+ characters)
   - Configure appropriate token expiration times
   - Enable account lockout policies

3. **Monitoring**
   - Monitor failed login attempts
   - Track permission changes
   - Set up alerts for suspicious activity

## Troubleshooting

### Common Issues

1. **Token Expired**
   - Implement automatic refresh
   - Check token expiration before requests
   - Handle 401 responses appropriately

2. **Permission Denied**
   - Verify user has required permissions
   - Check role assignments
   - Review permission middleware configuration

3. **Login Failures**
   - Check rate limiting settings
   - Verify account status
   - Review password policies

### Debug Information

Enable debug logging to troubleshoot authentication issues:

```javascript
// Server-side debugging
process.env.DEBUG = 'auth:*';

// Client-side debugging
localStorage.setItem('debug', 'auth:*');
```

This will provide detailed logs about authentication flows, token validation, and permission checks.