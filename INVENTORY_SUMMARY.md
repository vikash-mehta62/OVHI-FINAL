# OVHI Healthcare Platform - Complete System Inventory

## Executive Summary

This document provides a comprehensive inventory of the OVHI healthcare management platform, covering both backend services and frontend components. The system is built with a React/TypeScript frontend and Node.js/Express backend, organized around healthcare business domains.

## Backend Inventory

### Core Services Structure

```
server/services/
├── analytics/           # Business intelligence and reporting
├── appointment/         # Scheduling and appointment management
├── auth/               # Authentication and authorization
├── aws/                # AWS S3 file storage integration
├── billings/           # Medical billing and coding
├── ccm/                # Chronic Care Management
├── devices/            # Medical device integration
├── documents/          # Document management and generation
├── encounters/         # Clinical documentation and SOAP notes
├── general-apis/       # General utility APIs
├── intake/             # Patient intake forms
├── integrations/       # External system integrations
├── locations/          # Practice location management
├── mio/                # MIO Connect integration
├── patients/           # Patient management and profiles
├── payments/           # Payment processing (multi-gateway)
├── providers/          # Provider profiles and management
├── rcm/                # Revenue Cycle Management
├── ring-central/       # RingCentral telephony integration
├── settings/           # System configuration and settings
├── third-party-apis/   # Third-party API handlers
├── twilio/             # Twilio messaging integration
├── utils/              # Utility services
└── workflow-templates/ # Workflow template management
```

### Backend Modules & Endpoints

#### 1. Authentication & Authorization (`/api/v1/auth/`)
- **Files**: `authCtrl.js`, `authRoute.js`
- **Purpose**: User authentication, JWT token management, role-based access
- **Key Endpoints**:
  - POST `/login` - User authentication
  - POST `/register` - User registration
  - POST `/forgot-password` - Password reset
  - POST `/verify-email` - Email verification

#### 2. Patient Management (`/api/v1/patient/`, `/api/v1/patients/`)
- **Files**: `patientCtrl.js`, `patientRoute.js`, `enhancedPatientCtrl.js`, `enhancedPatientRoutes.js`, `patientAccountCtrl.js`, `patientAccountRoutes.js`
- **Purpose**: Complete patient lifecycle management
- **Key Endpoints**:
  - GET `/patients` - List patients
  - POST `/patients` - Create patient
  - GET `/patients/:id` - Get patient details
  - PUT `/patients/:id` - Update patient
  - GET `/patients/:id/enhanced` - Enhanced patient profile
  - GET `/patients/:id/completeness` - Profile completeness analysis

#### 3. Revenue Cycle Management (`/api/v1/rcm/`)
- **Files**: `rcmCtrl.js`, `rcmRoutes.js`, `collectionsCtrl.js`, `collectionsRoutes.js`, `claimValidationCtrl.js`, `eraProcessingCtrl.js`, `patientStatementCtrl.js`
- **Purpose**: Medical billing and revenue optimization
- **Key Endpoints**:
  - GET `/rcm/dashboard` - RCM dashboard data
  - GET `/rcm/claims` - Claims management
  - GET `/rcm/ar-aging` - A/R aging reports
  - POST `/rcm/era/process` - ERA file processing
  - GET `/rcm/collections` - Collections workflow
  - POST `/rcm/patients/:id/statements/generate` - Patient statements

#### 4. Payment Processing (`/api/v1/payments/`)
- **Files**: `paymentCtrl.js`, `paymentRoutes.js`
- **Purpose**: Multi-gateway payment processing
- **Key Endpoints**:
  - POST `/payments/process` - Process payment
  - GET `/payments/history` - Payment history
  - POST `/payments/refund` - Process refund

#### 5. Appointment Management (`/api/v1/appointment/`)
- **Files**: `appointment.js`, `appointmentRoutes.js`
- **Purpose**: Scheduling and appointment lifecycle
- **Key Endpoints**:
  - GET `/appointment` - List appointments
  - POST `/appointment` - Create appointment
  - PUT `/appointment/:id` - Update appointment
  - DELETE `/appointment/:id` - Cancel appointment

#### 6. Encounter Management (`/api/v1/encounters/`)
- **Files**: `encounterController.js`, `encounterRoutes.js`, `smartTemplateCtrl.js`, `smartTemplateRoutes.js`
- **Purpose**: Clinical documentation and workflow
- **Key Endpoints**:
  - GET `/encounters` - List encounters
  - POST `/encounters` - Create encounter
  - GET `/encounters/smart-templates` - Smart templates
  - POST `/encounters/smart-templates/ai-suggestions` - AI suggestions

#### 7. Billing & Coding (`/api/v1/billing/`)
- **Files**: `billingCtrl.js`, `billingRoutes.js`
- **Purpose**: Medical billing and coding automation
- **Key Endpoints**:
  - GET `/billing/claims` - Billing claims
  - POST `/billing/submit` - Submit claim
  - GET `/billing/statements` - Patient statements

#### 8. Care Management Modules (`/api/v1/ccm/`)
- **Files**: `ccmController.js`, `ccmRoutes.js`
- **Purpose**: Chronic Care Management
- **Key Endpoints**:
  - GET `/ccm/tasks` - CCM tasks
  - POST `/ccm/tasks` - Create CCM task
  - PUT `/ccm/tasks/:id` - Update task

#### 9. Settings & Configuration (`/api/v1/settings/`)
- **Files**: Multiple settings controllers and routes
- **Purpose**: System configuration and customization
- **Key Endpoints**:
  - GET `/settings/get-all-user-modules` - User modules
  - POST `/settings/rpm/enable` - Enable RPM
  - GET `/settings/regulatory/clia` - CLIA certificates
  - GET `/settings/document-numbering/sequences` - Document numbering

#### 10. Analytics & Reporting (`/api/v1/analytics/`)
- **Files**: `analyticsCtrl.js`, `analyticsRoutes.js`
- **Purpose**: Business intelligence and reporting
- **Key Endpoints**:
  - GET `/analytics/dashboard` - Dashboard analytics
  - GET `/analytics/financial` - Financial analytics
  - POST `/analytics/reports/generate` - Custom reports

#### 11. Integration Services
- **Files**: Various integration controllers
- **Purpose**: External system integrations
- **Key Endpoints**:
  - MIO Connect integration
  - RingCentral telephony
  - Twilio messaging
  - AWS S3 file storage

### Database Schema Overview

#### Core Tables
- **Users & Authentication**: User profiles, roles, permissions
- **Patients**: Demographics, insurance, medical history, enhanced profiles
- **Providers**: Provider profiles, specialties, schedules
- **Appointments**: Scheduling data, status tracking
- **Encounters**: Clinical documentation, SOAP notes
- **Billing**: Claims, payments, adjustments
- **RCM**: A/R aging, denials, collections, ERA processing
- **Settings**: Auto-specialty templates, document numbering, regulatory compliance

## Frontend Inventory

### Component Structure

```
src/components/
├── ai/                 # AI-powered features and document generation
├── analytics/          # Analytics dashboards and reporting
├── appointments/       # Appointment management UI
├── auth/              # Authentication forms and guards
├── billing/           # Billing forms and statements
├── blocks/            # Reusable UI blocks
├── ccm/               # Chronic Care Management UI
├── dashboard/         # Dashboard components
├── encounter/         # Encounter documentation UI
├── encounters/        # Encounter management
├── insurance/         # Insurance verification
├── intake/            # Patient intake forms
├── layout/            # Layout components (header, sidebar)
├── monitoring/        # Patient monitoring dashboards
├── patient/           # Patient management UI
├── payments/          # Payment processing UI
├── pcm/               # Principal Care Management
├── provider/          # Provider-specific components
├── rcm/               # RCM workflow UI
├── rpm/               # Remote Patient Monitoring
├── settings/          # Settings and configuration UI
├── tasks/             # Task management
├── telehealth/        # Telehealth and video calling
├── templates/         # Template management
├── ui/                # Base UI components (shadcn/ui)
└── vitals/            # Vitals input and display
```

### Page Structure

```
src/pages/
├── patient/           # Patient-specific pages
├── provider/          # Provider-specific pages
├── resources/         # Resource pages
├── service/           # Service pages
├── solutions/         # Solution pages
├── About.tsx          # About page
├── Analytics.tsx      # Analytics page
├── Appointments.tsx   # Appointments page
├── Billing.tsx        # Billing page
├── Dashboard.tsx      # Main dashboard
├── Encounters.tsx     # Encounters page
├── PatientProfile.tsx # Patient profile page
├── RCMManagement.tsx  # RCM management page
├── Settings.tsx       # Settings page
└── [other pages]      # Additional pages
```

### Frontend Routes

#### Provider Routes (`/provider/`)
- `/provider/dashboard` - Provider dashboard
- `/provider/patients` - Patient list
- `/provider/patients/:id` - Patient details
- `/provider/appointments` - Appointments
- `/provider/encounters` - Encounters
- `/provider/billing` - Billing
- `/provider/rcm` - RCM management
- `/provider/settings` - Settings

#### Patient Routes (`/patient/`)
- `/patient/dashboard` - Patient dashboard
- `/patient/medical` - Medical records
- `/patient/appointments` - Appointments
- `/patient/vitals` - Vitals tracking
- `/patient/insurance` - Insurance information

### State Management
- **Redux Toolkit**: Global state management
- **React Query**: Server state and caching
- **Context API**: Local state sharing

### Services Layer
```
src/services/
├── operations/        # Business logic services
├── apiConnector.js    # API connection utilities
├── apis.js           # API endpoint definitions
├── mockApi.ts        # Mock API for development
└── [service files]   # Specialized services
```

## Technology Stack Summary

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MySQL with mysql2 driver
- **Authentication**: JWT with bcryptjs
- **File Storage**: AWS S3 integration
- **Real-time**: Socket.IO
- **Payments**: Stripe integration
- **Documentation**: Swagger

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4+
- **UI Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State**: Redux Toolkit + React Query
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod

## Key Observations

### Strengths
1. **Comprehensive Coverage**: System covers all major healthcare domains
2. **Modern Architecture**: Uses current best practices and technologies
3. **Modular Design**: Well-organized feature-based structure
4. **Rich UI Components**: Extensive component library
5. **Integration Ready**: Multiple third-party integrations

### Areas for Investigation
1. **Route Coverage**: Some backend endpoints may lack frontend consumers
2. **Feature Completeness**: Some UI components may lack backend support
3. **API Consistency**: Need to verify API contract alignment
4. **Missing Modules**: Potential gaps in module coverage
5. **Navigation Completeness**: All features need discoverable navigation

This inventory serves as the foundation for the detailed gap analysis and coverage matrix that follows.