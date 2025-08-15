# 🏥 RCM System Complete Guide

## Overview
The Revenue Cycle Management (RCM) system is a comprehensive solution for managing medical billing, claims processing, payment collection, and revenue analytics. This system includes sample data and payment gateway integration for complete testing and understanding.

## 🚀 Quick Start

### 1. Install Sample Data and Payment System
```bash
node setup-rcm-with-payments.js
```

### 2. Start the System
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
npm run dev
```

### 3. Access RCM System
- Open: `http://localhost:8080`
- Login with provider credentials (role = 6)
- Navigate to: `http://localhost:8080/provider/rcm`

### 4. Test the System
```bash
node test-rcm-complete.js
```

## 📊 System Features

### Core RCM Features
- **Dashboard Analytics**: KPIs, revenue trends, collection rates
- **Claims Management**: Track, update, and manage insurance claims
- **A/R Aging**: Accounts receivable aging analysis and management
- **Denial Management**: Track and analyze claim denials
- **Payment Processing**: Credit card payments with Stripe integration
- **Revenue Forecasting**: Predictive revenue analytics
- **Collections Workflow**: Automated collection processes

### Payment Gateway Features
- **Multiple Gateways**: Stripe, Square, PayPal, Authorize.Net support
- **Credit Card Processing**: Secure payment processing
- **Payment Plans**: Installment payment options
- **Refund Management**: Process refunds and adjustments
- **Payment Analytics**: Transaction reporting and analysis
- **Webhook Integration**: Real-time payment notifications

## 📋 Sample Data Included

### Patients (10 sample patients)
- Patient IDs: 101-110
- Complete profiles with contact information
- Linked to provider for testing

### CPT Codes (10 common procedures)
- Evaluation & Management codes (99213-99215, 99203-99204)
- Mental Health codes (90834, 90837, 90791)
- Testing codes (96116, 96118)

### Billing Records (25 claims)
- Various statuses: Draft, Submitted, Paid, Denied
- Different aging buckets: 0-30, 31-60, 61-90, 120+ days
- Realistic amounts and dates

### Payment Records (6 sample payments)
- Completed credit card transactions
- Processing fees calculated
- Different card types (Visa, MasterCard, Amex)

### Insurance Claims
- ClaimMD tracking IDs
- Major payers: BCBS, Aetna, UnitedHealthcare, Cigna, Medicare
- Policy and group numbers

## 💳 Payment Gateway Setup

### Stripe Configuration
1. Go to Settings > Payment Gateways
2. Click "Add Gateway"
3. Select "Stripe"
4. Enter your API keys:
   - **Test Mode**: Use `pk_test_...` and `sk_test_...`
   - **Live Mode**: Use `pk_live_...` and `sk_live_...`
5. Configure webhook endpoint: `https://yourapp.com/api/v1/payments/stripe/webhook`
6. Test the connection and activate

### Test Credit Cards (Stripe)
```
Visa: 4242424242424242
MasterCard: 5555555555554444
American Express: 378282246310005
Declined: 4000000000000002
```

## 🔧 API Endpoints

### RCM Endpoints
```
GET  /api/v1/rcm/dashboard                    # Dashboard data
GET  /api/v1/rcm/claims                       # Claims list
GET  /api/v1/rcm/claims/:id/details           # Claim details
POST /api/v1/rcm/claims/:id/status            # Update claim status
GET  /api/v1/rcm/ar-aging                     # A/R aging report
GET  /api/v1/rcm/denial-analytics             # Denial analytics
GET  /api/v1/rcm/revenue-forecasting          # Revenue forecasting
GET  /api/v1/rcm/collections-workflow         # Collections workflow
```

### Payment Endpoints
```
GET  /api/v1/payments/gateways                # Payment gateways
POST /api/v1/payments/gateways                # Configure gateway
POST /api/v1/payments/intent                  # Create payment intent
POST /api/v1/payments/:id/confirm             # Confirm payment
GET  /api/v1/payments/history                 # Payment history
POST /api/v1/payments/:id/refund              # Process refund
GET  /api/v1/payments/analytics               # Payment analytics
```

## 📈 Understanding the Data

### Revenue Metrics
- **Total Revenue**: Sum of all billed amounts
- **Collection Rate**: (Collected Amount / Billed Amount) × 100
- **Denial Rate**: (Denied Claims / Total Claims) × 100
- **Days in A/R**: Average days from service to payment

### A/R Aging Buckets
- **0-30 days**: Recent claims, high collectability (95%)
- **31-60 days**: Follow-up needed, good collectability (85%)
- **61-90 days**: Collections required, moderate collectability (70%)
- **91-120 days**: Urgent collections, low collectability (50%)
- **120+ days**: Write-off candidates, very low collectability (25%)

### Claim Statuses
- **0 (Draft)**: Claim created but not submitted
- **1 (Submitted)**: Claim sent to payer
- **2 (Paid)**: Claim paid by payer
- **3 (Denied)**: Claim denied by payer
- **4 (Appealed)**: Claim under appeal

## 🎯 Testing Scenarios

### 1. Dashboard Testing
- View KPIs and revenue trends
- Filter by different timeframes (7d, 30d, 90d, 1y)
- Verify calculations match sample data

### 2. Claims Management Testing
- Browse claims list with pagination
- Filter by status, patient, date range
- Update claim statuses
- View detailed claim information

### 3. A/R Aging Testing
- Review aging buckets and amounts
- Check collectability scores
- Test recommended actions

### 4. Payment Processing Testing
- Configure Stripe with test keys
- Create payment intents
- Process test payments
- View payment history and analytics

### 5. Collections Workflow Testing
- Review collection accounts
- Update collection statuses
- Track collection activities

## 🔍 Troubleshooting

### Common Issues

#### "Backend server is not accessible"
```bash
cd server
npm install
npm run dev
```

#### "No active payment gateway configured"
1. Go to Settings > Payment Gateways
2. Add Stripe gateway with test keys
3. Activate the gateway

#### "Database connection failed"
1. Ensure MySQL is running
2. Check `.env` file in server directory
3. Create database: `CREATE DATABASE ovhi_db;`

#### "Sample data not showing"
```bash
node setup-rcm-with-payments.js
```

### Database Schema Issues
If tables are missing, run:
```sql
SOURCE server/sql/rcm_sample_data.sql;
```

### Payment Processing Issues
1. Verify Stripe keys are correct
2. Check webhook configuration
3. Test with Stripe test cards
4. Review browser console for errors

## 📚 File Structure

```
├── server/
│   ├── services/
│   │   ├── rcm/
│   │   │   ├── rcmCtrl.js          # RCM business logic
│   │   │   └── rcmRoutes.js        # RCM API routes
│   │   └── payments/
│   │       ├── paymentCtrl.js      # Payment processing logic
│   │       └── paymentRoutes.js    # Payment API routes
│   └── sql/
│       └── rcm_sample_data.sql     # Sample data installation
├── src/
│   ├── components/
│   │   ├── rcm/
│   │   │   └── RCMDashboard.tsx    # Main RCM dashboard
│   │   └── payments/
│   │       ├── PaymentForm.tsx     # Payment processing form
│   │       └── PaymentGatewaySettings.tsx # Gateway configuration
│   ├── pages/
│   │   └── RCMManagement.tsx       # RCM main page
│   └── services/
│       └── operations/
│           ├── rcm.js              # RCM API calls
│           └── payments.js         # Payment API calls
├── setup-rcm-with-payments.js     # Setup script
├── test-rcm-complete.js           # Comprehensive test suite
└── RCM_SYSTEM_GUIDE.md           # This guide
```

## 🎉 Success Indicators

### ✅ System Working Correctly
- Dashboard loads with sample data
- Claims list shows 25+ records
- A/R aging shows multiple buckets
- Payment gateway configured and active
- Test payments process successfully
- All API endpoints respond correctly

### 📊 Sample Data Verification
- **Total Billed**: ~$4,500
- **Total Collected**: ~$1,270
- **Collection Rate**: ~28%
- **Total Claims**: 25
- **Paid Claims**: 6
- **Denied Claims**: 4
- **Pending Claims**: 15

## 🔮 Next Steps

### Production Deployment
1. Replace test API keys with live keys
2. Configure production webhook endpoints
3. Set up SSL certificates
4. Configure backup and monitoring
5. Train staff on system usage

### Customization
1. Add custom CPT codes and pricing
2. Configure payer-specific rules
3. Set up automated workflows
4. Customize reporting templates
5. Integrate with existing systems

### Advanced Features
1. Electronic remittance advice (ERA) processing
2. Prior authorization management
3. Patient portal integration
4. Mobile app development
5. AI-powered denial prediction

## 📞 Support

For issues or questions:
1. Run diagnostic: `node debug-rcm-system.cjs`
2. Run tests: `node test-rcm-complete.js`
3. Check server logs for errors
4. Verify database connectivity
5. Review API documentation

---

**🎯 Your RCM system is now ready for comprehensive revenue cycle management with integrated payment processing!**