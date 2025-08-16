# Collections Management System - Complete Guide

## Overview

The Collections Management System is a comprehensive solution for managing patient account collections, payment plans, and collection activities within the OVHI healthcare platform. It provides automated workflows, detailed tracking, and analytics to optimize revenue collection processes.

## 🎯 Key Features

### 1. Patient Account Collections
- **Aging Analysis**: Track balances by aging buckets (0-30, 31-60, 61-90, 90+ days)
- **Collection Status Tracking**: New, Active, Payment Plan, Collections, Resolved, Written Off
- **Priority Management**: Low, Medium, High, Urgent priority levels
- **Collector Assignment**: Assign accounts to specific collection staff
- **Contact Attempt Tracking**: Monitor collection efforts and outcomes

### 2. Payment Plan Management
- **Flexible Payment Plans**: Set up custom payment schedules
- **Auto-Pay Integration**: Enable automatic payment processing
- **Payment Tracking**: Monitor payment plan compliance
- **Balance Management**: Automatic balance updates with payments
- **Plan Status Monitoring**: Active, Completed, Defaulted, Cancelled

### 3. Collection Activity Logging
- **Activity Types**: Phone calls, emails, letters, in-person visits
- **Outcome Tracking**: Success rates, contact results, payment promises
- **Next Action Planning**: Schedule follow-up activities
- **Performance Analytics**: Track collector performance and success rates

### 4. Automated Workflows
- **Collection Rules Engine**: Automated actions based on aging and balance
- **Letter Templates**: Standardized collection notices
- **Task Generation**: Automatic task creation for collection activities
- **Escalation Rules**: Priority escalation based on aging and amount

## 🏗️ System Architecture

### Frontend Components

#### CollectionsManagement.tsx
- **Location**: `src/components/rcm/CollectionsManagement.tsx`
- **Purpose**: Main collections management interface
- **Features**:
  - Patient accounts table with aging breakdown
  - Payment plan management interface
  - Collection activity logging
  - Analytics dashboard
  - Filtering and search capabilities

### Backend Services

#### Collections Controller
- **Location**: `server/services/rcm/collectionsCtrl.js`
- **Functions**:
  - `getPatientAccounts()` - Retrieve accounts for collections
  - `getPaymentPlans()` - Manage payment plans
  - `createPaymentPlan()` - Set up new payment plans
  - `logCollectionActivity()` - Record collection efforts
  - `getCollectionsAnalytics()` - Generate performance metrics

#### Collections Routes
- **Location**: `server/services/rcm/collectionsRoutes.js`
- **Endpoints**:
  - `GET /api/v1/rcm/collections/accounts` - Patient accounts
  - `GET /api/v1/rcm/collections/payment-plans` - Payment plans
  - `POST /api/v1/rcm/collections/payment-plans` - Create payment plan
  - `GET /api/v1/rcm/collections/activities` - Collection activities
  - `POST /api/v1/rcm/collections/activities` - Log activity
  - `GET /api/v1/rcm/collections/analytics` - Analytics data

### Database Schema

#### Core Tables

**payment_plans**
```sql
- id (Primary Key)
- patient_id (Foreign Key)
- total_amount
- monthly_payment
- remaining_balance
- next_payment_date
- status (active, completed, defaulted, cancelled)
- payments_remaining
- auto_pay_enabled
```

**collection_activities**
```sql
- id (Primary Key)
- patient_id (Foreign Key)
- activity_type (phone_call, email, letter, etc.)
- activity_date
- description
- outcome
- next_action
- next_action_date
- performed_by
```

**patient_accounts** (Enhanced)
```sql
- collection_status (new, active, payment_plan, collections, resolved)
- priority (low, medium, high, urgent)
- assigned_collector
- contact_attempts
- last_contact_date
- insurance_pending
```

#### Supporting Tables

**collection_letter_templates**
- Standardized collection notice templates
- Configurable timing and content

**collection_rules**
- Automated workflow rules
- Trigger conditions and actions

**collection_tasks**
- Manual follow-up task management
- Assignment and tracking

## 🚀 Setup Instructions

### 1. Database Setup
```bash
# Run the collections schema setup
node setup-collections-system.js
```

### 2. Backend Integration
The collections routes are automatically integrated into the RCM module:
```javascript
// Already included in server/services/rcm/rcmRoutes.js
router.use('/collections', collectionsRoutes);
```

### 3. Frontend Integration
The Collections Management component is available in the RCM module navigation.

## 📊 Usage Guide

### Patient Account Management

1. **View Collections Dashboard**
   - Navigate to RCM → Collections Management
   - Review aging summary cards
   - Filter accounts by status, priority, or aging

2. **Manage Individual Accounts**
   - Click on patient account to view details
   - Log collection activities
   - Set up payment plans
   - Update collection status and priority

3. **Collection Activity Logging**
   - Record phone calls, emails, letters
   - Track outcomes and next actions
   - Schedule follow-up activities
   - Monitor contact attempts

### Payment Plan Management

1. **Create Payment Plans**
   - Select patient account
   - Set total amount and monthly payment
   - Configure start date and auto-pay
   - Add notes and special instructions

2. **Monitor Payment Plans**
   - View active payment plans
   - Track payment compliance
   - Update plan terms as needed
   - Handle defaulted plans

### Analytics and Reporting

1. **Collections Performance**
   - Collection rate tracking
   - Average days to collect
   - Payment plan success rates
   - Aging distribution analysis

2. **Activity Analytics**
   - Collection activity trends
   - Outcome success rates
   - Collector performance metrics
   - Contact attempt analysis

## 🔧 Configuration Options

### Collection Rules
Configure automated collection workflows:
```sql
-- Example: 30-day first notice rule
INSERT INTO collection_rules (
  rule_name, 
  trigger_condition, 
  action_type, 
  action_parameters
) VALUES (
  '30 Day First Notice',
  '{"aging_days": 30, "balance_minimum": 25}',
  'send_letter',
  '{"template_type": "first_notice"}'
);
```

### Letter Templates
Customize collection notice templates:
```sql
-- Example: First notice template
INSERT INTO collection_letter_templates (
  template_name,
  template_type,
  subject,
  body_template,
  days_after_due
) VALUES (
  'First Notice',
  'first_notice',
  'Payment Reminder - Account #{ACCOUNT_NUMBER}',
  'Dear {PATIENT_NAME}...',
  30
);
```

## 🧪 Testing

### Run System Tests
```bash
# Test database setup and functionality
node test-collections-system.js
```

### API Testing
```bash
# Test API endpoints (requires running server)
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/rcm/collections/accounts
```

## 📈 Performance Metrics

### Key Performance Indicators (KPIs)

1. **Collection Rate**: Percentage of accounts resolved
2. **Average Days to Collect**: Time from due date to payment
3. **Payment Plan Success Rate**: Percentage of plans completed
4. **Contact Success Rate**: Successful contact attempts
5. **Aging Reduction**: Improvement in aging distribution

### Reporting Capabilities

1. **Collections Summary Report**
   - Aging analysis by status and priority
   - Total balances and account counts
   - Collection performance trends

2. **Payment Plan Report**
   - Active plan status and compliance
   - Payment schedule adherence
   - Auto-pay adoption rates

3. **Activity Report**
   - Collection activity volume and outcomes
   - Collector performance metrics
   - Contact attempt success rates

## 🔒 Security and Compliance

### Data Protection
- Patient information encryption
- Audit trail for all collection activities
- Role-based access control
- HIPAA compliance features

### Access Control
- Collections staff role permissions
- Manager oversight capabilities
- Patient privacy protections
- Secure payment processing

## 🛠️ Maintenance and Support

### Regular Maintenance Tasks

1. **Weekly**
   - Review aging reports
   - Process automated collection rules
   - Update payment plan statuses

2. **Monthly**
   - Analyze collection performance
   - Review and update collection rules
   - Generate compliance reports

3. **Quarterly**
   - Review letter templates
   - Update collection policies
   - Train staff on new features

### Troubleshooting

#### Common Issues

1. **Payment Plan Not Updating**
   - Check stored procedure execution
   - Verify payment posting integration
   - Review balance calculation logic

2. **Collection Rules Not Triggering**
   - Verify rule conditions
   - Check execution schedule
   - Review patient account data

3. **Activity Logging Failures**
   - Check database connections
   - Verify user permissions
   - Review API authentication

## 📞 Support and Documentation

### Additional Resources
- API Documentation: Available via Swagger UI
- Database Schema: `server/sql/collections_schema.sql`
- Test Scripts: `test-collections-system.js`
- Setup Guide: `setup-collections-system.js`

### Contact Information
For technical support or feature requests, contact the development team through the standard support channels.

---

## 🎉 Conclusion

The Collections Management System provides a comprehensive solution for healthcare revenue cycle management, combining automated workflows with detailed tracking and analytics. The system is designed to improve collection rates, reduce aging balances, and streamline collection processes while maintaining compliance and patient satisfaction.

Regular monitoring and optimization of collection rules and processes will ensure maximum effectiveness and revenue recovery for your healthcare organization.