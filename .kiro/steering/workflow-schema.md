# OVHI Healthcare Platform - Complete Module & Workflow Schema

## System Architecture Overview

OVHI is a comprehensive healthcare management platform with a React/TypeScript frontend and Node.js/Express backend, featuring modular architecture organized around healthcare business domains.

## Core Module Structure

### 1. Authentication & Authorization Module
**Location**: `src/components/auth/`, `server/services/auth/`
**Purpose**: User authentication, role-based access control
**Key Components**:
- Login/Signup forms
- JWT token management
- Role verification (Provider, Patient, Admin)
- Password reset functionality

### 2. Patient Management Module
**Location**: `src/components/patient/`, `server/services/patients/`
**Purpose**: Complete patient lifecycle management
**Key Components**:
- Patient registration and profiles
- Medical records management
- Patient account management
- Insurance information
- Vitals tracking
- Document management

### 3. Revenue Cycle Management (RCM) Module
**Location**: `src/components/rcm/`, `server/services/rcm/`
**Purpose**: Medical billing and revenue optimization
**Key Components**:
- Claims management and tracking
- A/R aging analysis
- Denial management
- Payment posting
- ERA processing
- Patient statements
- Revenue forecasting
- Collections workflow

### 4. Payment Processing Module
**Location**: `src/components/payments/`, `server/services/payments/`
**Purpose**: Multi-gateway payment processing
**Key Components**:
- Payment gateway configuration (Stripe, Square, PayPal, Authorize.Net)
- Payment intent creation
- Payment confirmation
- Refund processing
- Payment history and analytics

### 5. Appointment Management Module
**Location**: `src/components/appointments/`, `server/services/appointment/`
**Purpose**: Scheduling and appointment lifecycle
**Key Components**:
- Calendar views (monthly, provider-specific)
- Appointment booking and management
- Provider and location selection
- Appointment billing integration

### 6. Encounter Management Module
**Location**: `src/components/encounter/`, `server/services/encounters/`
**Purpose**: Clinical documentation and workflow
**Key Components**:
- SOAP notes editor
- Clinical decision support
- Encounter templates
- Smart CPT/diagnosis suggestions
- Billing integration

### 7. Billing & Coding Module
**Location**: `src/components/billing/`, `server/services/billings/`
**Purpose**: Medical billing and coding automation
**Key Components**:
- CMS-1500 form generation
- CPT/ICD code management
- Smart billing suggestions
- Patient statements
- Billing automation

### 8. Care Management Modules
**Location**: `src/components/ccm/`, `src/components/pcm/`, `src/components/rpm/`
**Purpose**: Chronic Care Management, Principal Care Management, Remote Patient Monitoring
**Key Components**:
- Care coordination activities
- Task management
- Patient monitoring dashboards
- Clinical guidance
- Time tracking for billing

### 9. Telehealth Module
**Location**: `src/components/telehealth/`
**Purpose**: Virtual care delivery
**Key Components**:
- Video conferencing (RingCentral integration)
- Patient queue management
- Session recording and notes
- Consultation history

### 10. Settings & Configuration Module
**Location**: `src/components/settings/`, `server/services/settings/`
**Purpose**: System configuration and customization
**Key Components**:
- Practice setup
- Provider profiles
- Specialty configurations
- Auto-specialty templates
- Notification settings
- Privacy settings
- Appearance customization

### 11. Analytics & Reporting Module
**Location**: `src/components/dashboard/`, `server/services/analytics/`
**Purpose**: Business intelligence and reporting
**Key Components**:
- Provider analytics dashboard
- RCM analytics
- Payment analytics
- Performance metrics
- Custom reports

### 12. Integration Module
**Location**: `server/services/integrations/`, `server/services/third-party-apis/`
**Purpose**: External system integrations
**Key Components**:
- MIO Connect integration
- RingCentral telephony
- Twilio messaging
- AWS S3 file storage
- ClaimMD integration

## Workflow Patterns

### 1. Patient Registration → Encounter → Billing → Payment Flow
```
Patient Registration → Insurance Verification → Appointment Scheduling → 
Encounter Documentation → Billing/Coding → Claim Submission → 
Payment Processing → A/R Management
```

### 2. RCM Workflow
```
Claim Creation → Validation → Submission → Status Tracking → 
Denial Management → Payment Posting → A/R Aging → Collections
```

### 3. Care Management Workflow
```
Patient Enrollment → Care Plan Creation → Task Assignment → 
Progress Monitoring → Documentation → Billing → Reporting
```

### 4. Telehealth Workflow
```
Appointment Scheduling → Patient Queue → Video Session → 
Clinical Documentation → Billing → Follow-up
```

## Database Schema Organization

### Core Tables Structure
- **Users & Authentication**: Users, roles, permissions
- **Patients**: Patient demographics, insurance, medical history
- **Providers**: Provider profiles, specialties, schedules
- **Appointments**: Scheduling data, status tracking
- **Encounters**: Clinical documentation, SOAP notes
- **Billing**: Claims, payments, adjustments
- **RCM**: A/R aging, denials, collections
- **Care Management**: Tasks, care plans, monitoring data

### Key Relationships
- Patient → Appointments → Encounters → Billing → Payments
- Provider → Specialties → Templates → Encounters
- Claims → Payments → Adjustments → A/R Aging

## API Architecture

### RESTful Endpoints Structure
```
/api/v1/auth/*          - Authentication endpoints
/api/v1/patients/*      - Patient management
/api/v1/appointments/*  - Scheduling
/api/v1/encounters/*    - Clinical documentation
/api/v1/billing/*       - Billing operations
/api/v1/rcm/*          - Revenue cycle management
/api/v1/payments/*     - Payment processing
/api/v1/settings/*     - Configuration
/api/v1/analytics/*    - Reporting and analytics
```

### Real-time Features
- **Socket.IO**: Real-time notifications, chat, status updates
- **WebRTC**: Video conferencing for telehealth
- **Live Updates**: Appointment status, payment confirmations

## Security & Compliance

### Authentication Flow
1. JWT-based authentication
2. Role-based access control (RBAC)
3. Session management
4. Password policies

### HIPAA Compliance Features
- Data encryption at rest and in transit
- Audit logging
- Access controls
- Patient consent management
- Secure file storage (AWS S3)

## Development Patterns

### Frontend Patterns
- **Component Architecture**: Feature-based organization
- **State Management**: Redux Toolkit + React Query
- **Form Handling**: React Hook Form + Zod validation
- **UI Components**: shadcn/ui + Radix UI primitives

### Backend Patterns
- **MVC Architecture**: Controllers, services, routes separation
- **Middleware**: Authentication, validation, error handling
- **Database**: MySQL with connection pooling
- **File Upload**: Multer + AWS S3 integration

### Code Organization
- **Feature Modules**: Self-contained business domains
- **Shared Components**: Reusable UI and utility components
- **Service Layer**: Business logic abstraction
- **API Layer**: RESTful endpoints with validation

This schema provides a comprehensive overview of the OVHI platform's architecture, enabling efficient development and maintenance of the healthcare management system.