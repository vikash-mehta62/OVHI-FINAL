# Revenue Cycle Management (RCM) Implementation

## Overview
This document outlines the complete RCM implementation for the OVHI Healthcare Management System, connecting the frontend UI with backend APIs to provide real-time revenue cycle management capabilities.

## 🏗️ Architecture

### Backend Implementation
- **Location**: `server/services/rcm/`
- **Routes**: `rcmRoutes.js` - RESTful API endpoints
- **Controller**: `rcmCtrl.js` - Business logic and database operations
- **Database**: MySQL with existing healthcare tables

### Frontend Implementation
- **Main Page**: `src/pages/RCMManagement.tsx`
- **Components**: `src/components/rcm/` directory
- **API Services**: `src/services/operations/rcm.js`
- **State Management**: Redux + React hooks

## 📊 Features Implemented

### 1. Dashboard Analytics
- **Endpoint**: `GET /api/v1/rcm/dashboard`
- **Features**:
  - Total revenue tracking
  - Collection rate calculation
  - Denial rate monitoring
  - Days in A/R analysis
  - Monthly revenue trends

### 2. Claims Status Tracking
- **Endpoint**: `GET /api/v1/rcm/claims`
- **Features**:
  - Real-time claim status updates
  - Search and filtering capabilities
  - Pagination support
  - Bulk status updates
  - ClaimMD integration ready

### 3. A/R Aging Intelligence
- **Endpoint**: `GET /api/v1/rcm/ar-aging`
- **Features**:
  - Aging bucket analysis (0-30, 31-60, 61-90, 91-120, 120+ days)
  - Collectability scoring
  - AI-powered recommendations
  - Automated follow-up workflows

### 4. Denial Management
- **Endpoint**: `GET /api/v1/rcm/denials/analytics`
- **Features**:
  - Denial trend analysis
  - Root cause identification
  - Appeal tracking
  - Prevention strategies

### 5. Payment Posting
- **Endpoint**: `GET /api/v1/rcm/payments`
- **Features**:
  - Daily payment summaries
  - ERA file processing
  - Payment reconciliation
  - Batch posting capabilities

### 6. Revenue Forecasting
- **Endpoint**: `GET /api/v1/rcm/revenue-forecasting`
- **Features**:
  - Historical trend analysis
  - 6-month revenue projections
  - Growth rate calculations
  - Confidence scoring

### 7. Collections Workflow
- **Endpoint**: `GET /api/v1/rcm/collections`
- **Features**:
  - Automated collection workflows
  - Patient communication tracking
  - Payment plan management
  - Collection agency integration

## 🔌 API Endpoints

### Dashboard & Analytics
```
GET /api/v1/rcm/dashboard?timeframe=30d
GET /api/v1/rcm/analytics
GET /api/v1/rcm/revenue-forecasting
GET /api/v1/rcm/payer-performance
```

### Claims Management
```
GET /api/v1/rcm/claims?page=1&limit=10&status=all&search=
GET /api/v1/rcm/claims/:claimId
PUT /api/v1/rcm/claims/:claimId/status
POST /api/v1/rcm/claims/bulk-update
```

### A/R & Collections
```
GET /api/v1/rcm/ar-aging
GET /api/v1/rcm/ar-aging/:accountId
POST /api/v1/rcm/ar-aging/:accountId/follow-up
POST /api/v1/rcm/ar-aging/:accountId/payment-plan
GET /api/v1/rcm/collections
PUT /api/v1/rcm/collections/:accountId/status
```

### Denials & Payments
```
GET /api/v1/rcm/denials/analytics?timeframe=30d
GET /api/v1/rcm/denials/trends
GET /api/v1/rcm/payments?date=2024-01-15
POST /api/v1/rcm/payments/era/process
```

### ClaimMD Integration
```
GET /api/v1/rcm/claimmd/status/:trackingId
POST /api/v1/rcm/claimmd/sync
```

## 🗄️ Database Schema

### Core Tables Used
- `cpt_billing` - Billing records with status tracking
- `cpt_codes` - CPT code reference data
- `users_mappings` - Provider-patient relationships
- `user_profiles` - Patient demographic data
- `patient_claims` - ClaimMD integration data
- `patient_insurances` - Insurance information
- `patient_diagnoses` - Diagnosis codes

### Status Codes
- `0` - Draft
- `1` - Submitted
- `2` - Paid
- `3` - Denied
- `4` - Appealed

## 🚀 Getting Started

### 1. Backend Setup
```bash
# The RCM routes are already integrated into the main server
# No additional setup required - routes are available at /api/v1/rcm/*
```

### 2. Frontend Usage
```typescript
import { getRCMDashboardDataAPI } from '@/services/operations/rcm';

// Fetch dashboard data
const dashboardData = await getRCMDashboardDataAPI(token, '30d');
```

### 3. Testing
```bash
# Start the server
npm run dev

# Test RCM endpoints (update token in test file)
node server/test-rcm.js
```

## 📱 Frontend Components

### Main RCM Page
- **File**: `src/pages/RCMManagement.tsx`
- **Features**: Tabbed interface with all RCM modules
- **State**: Redux integration for user authentication

### Key Components
1. **RCMAnalyticsDashboard** - KPI metrics and charts
2. **ClaimsStatusTracker** - Real-time claim monitoring
3. **ARAgingIntelligence** - A/R analysis and automation
4. **DenialManagementWorkflow** - Denial tracking and appeals
5. **PaymentPostingEngine** - Payment processing
6. **CollectionsWorkflowManager** - Collection automation

## 🔐 Security & Authentication

- All endpoints require JWT authentication
- Role-based access control (Provider role = 6)
- Audit logging for all RCM operations
- Data encryption in transit and at rest

## 📊 Real-time Features

- Auto-refresh capabilities for live data
- Socket.IO integration for real-time updates
- Automated workflow triggers
- Smart notifications and alerts

## 🔧 Configuration

### Environment Variables
```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
MD_ACCOUNT_KEY=your_claimmd_key
```

### Frontend Configuration
```typescript
// API base URL configuration in src/services/apis.js
const BASE_URL = "http://localhost:8000/api/v1"
```

## 🧪 Testing

### Manual Testing
1. Navigate to `http://localhost:8080/provider/rcm`
2. Login with provider credentials
3. Test each tab and functionality
4. Verify data loads from backend APIs

### API Testing
Use the provided test script or tools like Postman to test individual endpoints.

## 🚀 Deployment

### Production Considerations
1. Update API base URLs for production
2. Configure proper database connections
3. Set up ClaimMD integration credentials
4. Enable SSL/TLS for secure communication
5. Configure proper CORS settings

## 📈 Performance Optimization

- Database query optimization with proper indexing
- Pagination for large datasets
- Caching for frequently accessed data
- Lazy loading for components
- Code splitting for better load times

## 🔮 Future Enhancements

1. **Advanced Analytics**: Machine learning for predictive analytics
2. **Mobile App**: React Native implementation
3. **Third-party Integrations**: More clearinghouse connections
4. **Automated Workflows**: Enhanced AI-driven automation
5. **Reporting**: Advanced report generation and scheduling

## 🐛 Troubleshooting

### Common Issues
1. **Database Connection**: Check MySQL connection settings
2. **Authentication**: Verify JWT token validity
3. **CORS Issues**: Configure proper CORS settings
4. **Data Not Loading**: Check API endpoints and network requests

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment.

## 📞 Support

For technical support or questions about the RCM implementation:
1. Check the API documentation
2. Review the database schema
3. Test individual endpoints
4. Check browser console for frontend errors
5. Review server logs for backend issues

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Author**: OVHI Development Team