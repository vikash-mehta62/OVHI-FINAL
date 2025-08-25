# RCM Module Architecture Documentation

This document provides a comprehensive overview of the RCM (Revenue Cycle Management) module architecture, including system design, component relationships, and data flow patterns.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [High-Level Architecture](#high-level-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Architecture](#database-architecture)
7. [API Design](#api-design)
8. [Security Architecture](#security-architecture)
9. [Performance Architecture](#performance-architecture)
10. [Deployment Architecture](#deployment-architecture)

## System Overview

The RCM module is a comprehensive healthcare revenue cycle management system that handles the complete billing workflow from patient registration to payment collection. It's built using a modern, scalable architecture with clear separation of concerns.

### Key Components

- **Frontend**: React-based SPA with TypeScript
- **Backend**: Node.js/Express API server
- **Database**: MySQL with optimized schemas
- **Cache**: Redis for session and data caching
- **Monitoring**: Prometheus + Grafana stack
- **Security**: JWT-based authentication with RBAC

## Architecture Principles

### 1. Separation of Concerns
- Clear boundaries between presentation, business logic, and data layers
- Modular design with focused responsibilities

### 2. Scalability
- Horizontal scaling capabilities
- Stateless service design
- Efficient caching strategies

### 3. Maintainability
- Clean code principles
- Comprehensive testing
- Clear documentation

### 4. Security
- Defense in depth
- Principle of least privilege
- Data encryption and validation

### 5. Performance
- Optimized database queries
- Efficient caching
- Lazy loading and code splitting

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOBILE[Mobile App]
    end
    
    subgraph "Load Balancer"
        LB[Nginx Load Balancer]
    end
    
    subgraph "Application Layer"
        APP1[RCM App Instance 1]
        APP2[RCM App Instance 2]
        APP3[RCM App Instance N]
    end
    
    subgraph "Service Layer"
        AUTH[Auth Service]
        RCM[RCM Service]
        PAYMENT[Payment Service]
        NOTIFICATION[Notification Service]
    end
    
    subgraph "Data Layer"
        DB[(MySQL Database)]
        CACHE[(Redis Cache)]
        FILES[File Storage S3]
    end
    
    subgraph "External Services"
        STRIPE[Stripe API]
        EMAIL[Email Service]
        SMS[SMS Service]
    end
    
    subgraph "Monitoring"
        PROMETHEUS[Prometheus]
        GRAFANA[Grafana]
        LOGS[Log Aggregation]
    end
    
    WEB --> LB
    MOBILE --> LB
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> AUTH
    APP1 --> RCM
    APP1 --> PAYMENT
    APP1 --> NOTIFICATION
    
    AUTH --> DB
    AUTH --> CACHE
    RCM --> DB
    RCM --> CACHE
    PAYMENT --> STRIPE
    NOTIFICATION --> EMAIL
    NOTIFICATION --> SMS
    
    RCM --> FILES
    
    APP1 --> PROMETHEUS
    PROMETHEUS --> GRAFANA
    APP1 --> LOGS
```

## Frontend Architecture

### Component Architecture

```mermaid
graph TD
    subgraph "Application Shell"
        APP[App Component]
        ROUTER[React Router]
        STORE[Redux Store]
    end
    
    subgraph "RCM Module"
        DASHBOARD[RCM Dashboard]
        CLAIMS[Claims Management]
        PAYMENTS[Payment Processing]
        REPORTS[Reports & Analytics]
    end
    
    subgraph "Shared Components"
        UI[UI Components]
        FORMS[Form Components]
        CHARTS[Chart Components]
        TABLES[Table Components]
    end
    
    subgraph "Services & Hooks"
        API[API Services]
        HOOKS[Custom Hooks]
        UTILS[Utilities]
    end
    
    subgraph "State Management"
        SLICES[Redux Slices]
        MIDDLEWARE[Middleware]
        SELECTORS[Selectors]
    end
    
    APP --> ROUTER
    APP --> STORE
    ROUTER --> DASHBOARD
    ROUTER --> CLAIMS
    ROUTER --> PAYMENTS
    ROUTER --> REPORTS
    
    DASHBOARD --> UI
    CLAIMS --> FORMS
    PAYMENTS --> CHARTS
    REPORTS --> TABLES
    
    DASHBOARD --> HOOKS
    CLAIMS --> API
    PAYMENTS --> UTILS
    
    STORE --> SLICES
    STORE --> MIDDLEWARE
    SLICES --> SELECTORS
```

### Data Flow Pattern

```mermaid
sequenceDiagram
    participant User
    participant Component
    participant Hook
    participant Service
    participant Store
    participant API
    
    User->>Component: User Action
    Component->>Hook: Call Custom Hook
    Hook->>Service: API Call
    Service->>API: HTTP Request
    API-->>Service: Response Data
    Service-->>Hook: Processed Data
    Hook->>Store: Dispatch Action
    Store-->>Component: Updated State
    Component-->>User: UI Update
```

### Component Structure

```
src/components/rcm/
├── dashboard/
│   ├── RCMDashboard.tsx          # Main dashboard container
│   ├── KPISection.tsx            # Key performance indicators
│   ├── ChartsSection.tsx         # Revenue charts
│   └── RecentActivity.tsx        # Recent claims/payments
├── claims/
│   ├── ClaimsList.tsx            # Claims listing
│   ├── ClaimForm.tsx             # Claim creation/editing
│   ├── ClaimDetails.tsx          # Claim detail view
│   └── ClaimStatusBadge.tsx      # Status indicator
├── payments/
│   ├── PaymentsList.tsx          # Payments listing
│   ├── PaymentForm.tsx           # Payment processing
│   └── PaymentHistory.tsx        # Payment history
└── shared/
    ├── KPICard.tsx               # Reusable KPI card
    ├── StatusBadge.tsx           # Status indicators
    ├── CurrencyDisplay.tsx       # Currency formatting
    └── LoadingSpinner.tsx        # Loading states
```

## Backend Architecture

### Service Layer Architecture

```mermaid
graph TB
    subgraph "API Layer"
        ROUTES[Express Routes]
        MIDDLEWARE[Middleware Stack]
        CONTROLLERS[Controllers]
    end
    
    subgraph "Business Logic Layer"
        RCM_SERVICE[RCM Service]
        PAYMENT_SERVICE[Payment Service]
        AUTH_SERVICE[Auth Service]
        NOTIFICATION_SERVICE[Notification Service]
    end
    
    subgraph "Data Access Layer"
        DB_UTILS[Database Utils]
        REPOSITORIES[Repositories]
        MODELS[Data Models]
    end
    
    subgraph "External Integrations"
        PAYMENT_GATEWAY[Payment Gateways]
        EMAIL_PROVIDER[Email Provider]
        FILE_STORAGE[File Storage]
    end
    
    ROUTES --> MIDDLEWARE
    MIDDLEWARE --> CONTROLLERS
    CONTROLLERS --> RCM_SERVICE
    CONTROLLERS --> PAYMENT_SERVICE
    CONTROLLERS --> AUTH_SERVICE
    
    RCM_SERVICE --> DB_UTILS
    PAYMENT_SERVICE --> REPOSITORIES
    AUTH_SERVICE --> MODELS
    
    PAYMENT_SERVICE --> PAYMENT_GATEWAY
    NOTIFICATION_SERVICE --> EMAIL_PROVIDER
    RCM_SERVICE --> FILE_STORAGE
```

### Request Processing Flow

```mermaid
sequenceDiagram
    participant Client
    participant Router
    participant Auth
    participant Validation
    participant Controller
    participant Service
    participant Database
    
    Client->>Router: HTTP Request
    Router->>Auth: Authenticate
    Auth-->>Router: User Context
    Router->>Validation: Validate Input
    Validation-->>Router: Validated Data
    Router->>Controller: Process Request
    Controller->>Service: Business Logic
    Service->>Database: Data Operation
    Database-->>Service: Query Result
    Service-->>Controller: Processed Data
    Controller-->>Router: Response Data
    Router-->>Client: HTTP Response
```

### Service Structure

```
server/services/rcm/
├── rcmService.js                 # Main RCM business logic
├── claimService.js               # Claim processing
├── paymentService.js             # Payment handling
├── reportService.js              # Analytics and reporting
└── validationService.js         # Data validation
```

## Database Architecture

### Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ CLAIM : creates
    USER ||--o{ PAYMENT : processes
    CLAIM ||--o{ CLAIM_ITEM : contains
    CLAIM ||--o{ PAYMENT : receives
    PATIENT ||--o{ CLAIM : has
    INSURANCE ||--o{ CLAIM : covers
    
    USER {
        string id PK
        string email
        string password_hash
        string role
        timestamp created_at
        timestamp updated_at
    }
    
    PATIENT {
        string id PK
        string first_name
        string last_name
        date date_of_birth
        string insurance_id
        timestamp created_at
    }
    
    CLAIM {
        string id PK
        string patient_id FK
        string user_id FK
        decimal total_amount
        string status
        date service_date
        timestamp created_at
        timestamp updated_at
    }
    
    CLAIM_ITEM {
        string id PK
        string claim_id FK
        string cpt_code
        string description
        decimal amount
        integer quantity
    }
    
    PAYMENT {
        string id PK
        string claim_id FK
        string user_id FK
        decimal amount
        string payment_method
        string status
        timestamp processed_at
    }
    
    INSURANCE {
        string id PK
        string provider_name
        string policy_number
        decimal coverage_percentage
        decimal deductible
    }
```

### Database Schema Design

```sql
-- Claims table with optimized indexing
CREATE TABLE claim (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'denied', 'paid') NOT NULL DEFAULT 'draft',
    service_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_claim_status (status),
    INDEX idx_claim_patient (patient_id),
    INDEX idx_claim_user (user_id),
    INDEX idx_claim_service_date (service_date),
    INDEX idx_claim_created (created_at),
    
    FOREIGN KEY (patient_id) REFERENCES patient(id),
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- Payments table with transaction support
CREATE TABLE payment (
    id VARCHAR(36) PRIMARY KEY,
    claim_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('credit_card', 'bank_transfer', 'check', 'cash') NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(255),
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_payment_claim (claim_id),
    INDEX idx_payment_status (status),
    INDEX idx_payment_processed (processed_at),
    
    FOREIGN KEY (claim_id) REFERENCES claim(id),
    FOREIGN KEY (user_id) REFERENCES user(id)
);
```

## API Design

### RESTful API Structure

```
/api/v1/rcm/
├── claims/
│   ├── GET    /                  # List claims
│   ├── POST   /                  # Create claim
│   ├── GET    /:id               # Get claim details
│   ├── PUT    /:id               # Update claim
│   ├── DELETE /:id               # Delete claim
│   └── POST   /:id/submit        # Submit claim
├── payments/
│   ├── GET    /                  # List payments
│   ├── POST   /                  # Process payment
│   ├── GET    /:id               # Get payment details
│   └── POST   /:id/refund        # Refund payment
├── reports/
│   ├── GET    /dashboard         # Dashboard data
│   ├── GET    /revenue           # Revenue analytics
│   └── GET    /aging             # A/R aging report
└── settings/
    ├── GET    /                  # Get RCM settings
    └── PUT    /                  # Update settings
```

### API Response Format

```json
{
  "success": true,
  "data": {
    "id": "claim-123",
    "patientName": "John Doe",
    "amount": 1500.00,
    "status": "approved"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0",
    "requestId": "req-456"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Auth
    participant JWT
    participant Database
    
    Client->>Auth: Login Request
    Auth->>Database: Validate Credentials
    Database-->>Auth: User Data
    Auth->>JWT: Generate Tokens
    JWT-->>Auth: Access + Refresh Tokens
    Auth-->>Client: Tokens + User Info
    
    Note over Client: Store tokens securely
    
    Client->>Auth: API Request + Access Token
    Auth->>JWT: Validate Token
    JWT-->>Auth: Token Valid
    Auth-->>Client: Authorized Response
```

### Security Layers

```mermaid
graph TB
    subgraph "Network Security"
        HTTPS[HTTPS/TLS]
        FIREWALL[Firewall Rules]
        DDOS[DDoS Protection]
    end
    
    subgraph "Application Security"
        AUTH[Authentication]
        AUTHZ[Authorization]
        VALIDATION[Input Validation]
        SANITIZATION[Data Sanitization]
    end
    
    subgraph "Data Security"
        ENCRYPTION[Data Encryption]
        HASHING[Password Hashing]
        AUDIT[Audit Logging]
    end
    
    HTTPS --> AUTH
    FIREWALL --> AUTHZ
    DDOS --> VALIDATION
    
    AUTH --> ENCRYPTION
    AUTHZ --> HASHING
    VALIDATION --> AUDIT
```

## Performance Architecture

### Caching Strategy

```mermaid
graph TB
    subgraph "Client Side"
        BROWSER[Browser Cache]
        STORAGE[Local Storage]
    end
    
    subgraph "CDN Layer"
        CDN[Content Delivery Network]
    end
    
    subgraph "Application Layer"
        MEMORY[In-Memory Cache]
        REDIS[Redis Cache]
    end
    
    subgraph "Database Layer"
        QUERY[Query Cache]
        BUFFER[Buffer Pool]
    end
    
    BROWSER --> CDN
    CDN --> MEMORY
    MEMORY --> REDIS
    REDIS --> QUERY
    QUERY --> BUFFER
```

### Performance Optimization

1. **Database Optimization**
   - Proper indexing strategy
   - Query optimization
   - Connection pooling
   - Read replicas for reporting

2. **Application Optimization**
   - Code splitting and lazy loading
   - Component memoization
   - Efficient state management
   - API response caching

3. **Infrastructure Optimization**
   - Load balancing
   - Auto-scaling
   - CDN for static assets
   - Database sharding (future)

## Deployment Architecture

### Container Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Load Balancer"
            LB[Nginx Load Balancer]
        end
        
        subgraph "Application Tier"
            APP1[RCM App Container 1]
            APP2[RCM App Container 2]
            APP3[RCM App Container 3]
        end
        
        subgraph "Data Tier"
            DB[MySQL Container]
            REDIS[Redis Container]
        end
        
        subgraph "Monitoring Tier"
            PROM[Prometheus]
            GRAF[Grafana]
        end
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> DB
    APP1 --> REDIS
    APP2 --> DB
    APP2 --> REDIS
    APP3 --> DB
    APP3 --> REDIS
    
    APP1 --> PROM
    PROM --> GRAF
```

### Kubernetes Deployment

```yaml
# Example Kubernetes deployment structure
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rcm-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rcm-app
  template:
    metadata:
      labels:
        app: rcm-app
    spec:
      containers:
      - name: rcm-app
        image: rcm-app:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

## Scalability Considerations

### Horizontal Scaling

1. **Stateless Application Design**
   - No server-side sessions
   - JWT-based authentication
   - External state storage (Redis)

2. **Database Scaling**
   - Read replicas for reporting
   - Connection pooling
   - Query optimization
   - Future: Database sharding

3. **Caching Strategy**
   - Multi-level caching
   - Cache invalidation strategies
   - CDN for static content

### Vertical Scaling

1. **Resource Optimization**
   - Memory usage optimization
   - CPU-intensive task optimization
   - I/O optimization

2. **Performance Monitoring**
   - Real-time metrics
   - Performance bottleneck identification
   - Capacity planning

## Future Architecture Considerations

### Microservices Migration

```mermaid
graph TB
    subgraph "Current Monolithic Architecture"
        MONO[RCM Monolith]
    end
    
    subgraph "Future Microservices Architecture"
        CLAIM[Claims Service]
        PAYMENT[Payments Service]
        PATIENT[Patient Service]
        REPORT[Reporting Service]
        NOTIFICATION[Notification Service]
    end
    
    subgraph "Shared Infrastructure"
        API_GATEWAY[API Gateway]
        SERVICE_MESH[Service Mesh]
        CONFIG[Config Service]
        DISCOVERY[Service Discovery]
    end
    
    MONO -.-> CLAIM
    MONO -.-> PAYMENT
    MONO -.-> PATIENT
    MONO -.-> REPORT
    MONO -.-> NOTIFICATION
    
    API_GATEWAY --> CLAIM
    API_GATEWAY --> PAYMENT
    SERVICE_MESH --> CONFIG
    SERVICE_MESH --> DISCOVERY
```

### Event-Driven Architecture

```mermaid
graph TB
    subgraph "Event Sources"
        CLAIM_EVENTS[Claim Events]
        PAYMENT_EVENTS[Payment Events]
        USER_EVENTS[User Events]
    end
    
    subgraph "Event Bus"
        KAFKA[Apache Kafka]
    end
    
    subgraph "Event Consumers"
        NOTIFICATION[Notification Service]
        ANALYTICS[Analytics Service]
        AUDIT[Audit Service]
        REPORTING[Reporting Service]
    end
    
    CLAIM_EVENTS --> KAFKA
    PAYMENT_EVENTS --> KAFKA
    USER_EVENTS --> KAFKA
    
    KAFKA --> NOTIFICATION
    KAFKA --> ANALYTICS
    KAFKA --> AUDIT
    KAFKA --> REPORTING
```

## Conclusion

This architecture provides:

- **Scalability**: Horizontal and vertical scaling capabilities
- **Maintainability**: Clear separation of concerns and modular design
- **Security**: Multiple layers of security controls
- **Performance**: Optimized for high throughput and low latency
- **Reliability**: Fault tolerance and disaster recovery
- **Flexibility**: Easy to extend and modify

The architecture is designed to evolve with business needs while maintaining stability and performance. Regular architecture reviews ensure the system continues to meet requirements as it scales.