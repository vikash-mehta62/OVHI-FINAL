# End User Guide

## Overview

Welcome to the RCM (Revenue Cycle Management) System! This guide will help you navigate and use the system effectively to manage claims, payments, and revenue cycle operations.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Claims Management](#claims-management)
4. [Payment Processing](#payment-processing)
5. [A/R Aging](#ar-aging)
6. [Collections](#collections)
7. [Denial Management](#denial-management)
8. [Reports & Analytics](#reports--analytics)
9. [Settings](#settings)
10. [Tips & Best Practices](#tips--best-practices)

## Getting Started

### First Time Login

1. **Access the System**
   - Open your web browser
   - Navigate to your organization's RCM system URL
   - Enter your username and password
   - Click **Sign In**

2. **Initial Setup**
   - Complete your profile information
   - Set up two-factor authentication (if required)
   - Review your dashboard permissions
   - Familiarize yourself with the navigation menu

### Navigation Overview

The main navigation includes:
- **Dashboard**: Overview of key metrics and activities
- **Claims**: Manage insurance claims and submissions
- **Payments**: Process and track payments
- **A/R Aging**: Monitor accounts receivable aging
- **Collections**: Manage collection activities
- **Denials**: Handle claim denials and appeals
- **Reports**: Generate and view reports
- **Settings**: Configure personal and system settings

## Dashboard Overview

### Key Performance Indicators (KPIs)

Your dashboard displays important metrics:

#### Revenue Metrics
- **Total Revenue**: Current period revenue
- **Monthly Growth**: Revenue growth percentage
- **Average Reimbursement**: Average payment per claim
- **Collection Rate**: Percentage of collectible revenue collected

#### Operational Metrics
- **Total Claims**: Number of claims processed
- **Pending Claims**: Claims awaiting processing
- **Denied Claims**: Claims that were denied
- **Processing Time**: Average time to process claims

### Dashboard Widgets

#### Recent Activities
Shows your recent actions and system updates:
- Claims submitted
- Payments processed
- Denials received
- Collection activities

#### Quick Actions
Access frequently used functions:
- **Create New Claim**
- **Process Payment**
- **Generate Report**
- **View Pending Tasks**

#### Charts and Graphs
Visual representations of:
- Revenue trends over time
- Claims by status
- Payment methods distribution
- Denial reasons analysis

## Claims Management

### Creating a New Claim

1. **Navigate to Claims**
   - Click **Claims** in the main menu
   - Click **New Claim** button

2. **Enter Patient Information**
   ```
   Patient Name: [First and Last Name]
   Date of Birth: [MM/DD/YYYY]
   Patient ID: [Unique identifier]
   Insurance ID: [Insurance member ID]
   ```

3. **Service Details**
   ```
   Service Date: [Date of service]
   Provider: [Select from dropdown]
   Diagnosis Code: [ICD-10 code]
   Procedure Code: [CPT code]
   Service Amount: [Dollar amount]
   ```

4. **Insurance Information**
   ```
   Primary Insurance: [Insurance company]
   Policy Number: [Policy identifier]
   Group Number: [Group identifier]
   Authorization Number: [If required]
   ```

5. **Submit Claim**
   - Review all information for accuracy
   - Click **Submit Claim**
   - Note the claim number for tracking

### Managing Existing Claims

#### Viewing Claims
1. Go to **Claims** section
2. Use filters to find specific claims:
   - **Status**: Submitted, Approved, Denied, Paid
   - **Date Range**: Service date or submission date
   - **Provider**: Filter by healthcare provider
   - **Patient**: Search by patient name or ID

#### Claim Status Meanings
- **Submitted**: Claim sent to insurance
- **In Review**: Insurance is processing the claim
- **Approved**: Claim approved for payment
- **Denied**: Claim rejected by insurance
- **Paid**: Payment received from insurance
- **Partial Payment**: Partial payment received

#### Updating Claim Information
1. Find the claim in the claims list
2. Click **Edit** next to the claim
3. Modify necessary information
4. Add notes explaining changes
5. Click **Save Changes**

### Claim Tracking

#### Electronic Remittance Advice (ERA)
- Automatically imported from insurance companies
- Shows payment details and adjustments
- Identifies denied or reduced payments
- Provides explanation codes

#### Claim Status Inquiries
- Real-time status updates from clearinghouses
- Automated status checking
- Email notifications for status changes
- Historical status tracking

## Payment Processing

### Recording Insurance Payments

1. **Navigate to Payments**
   - Click **Payments** in the main menu
   - Click **New Payment**

2. **Payment Details**
   ```
   Claim Number: [Associated claim]
   Payment Amount: [Dollar amount received]
   Payment Date: [Date payment received]
   Check Number: [Insurance check number]
   Payment Method: Insurance, Patient, Other
   ```

3. **Adjustments**
   ```
   Contractual Adjustment: [Contracted rate difference]
   Write-off Amount: [Uncollectible amount]
   Reason Code: [Explanation for adjustment]
   ```

4. **Apply Payment**
   - Review payment allocation
   - Click **Apply Payment**
   - Verify claim balance updates

### Patient Payment Processing

#### Online Payments
1. **Payment Portal Access**
   - Patients receive secure payment links
   - Multiple payment methods accepted
   - Automatic receipt generation
   - Real-time payment posting

2. **Payment Plans**
   - Set up installment plans
   - Automatic recurring payments
   - Payment reminders
   - Plan modification options

#### Manual Payment Entry
1. **Cash/Check Payments**
   ```
   Patient Name: [Patient identifier]
   Payment Amount: [Amount received]
   Payment Method: Cash, Check, Credit Card
   Reference Number: [Check number or transaction ID]
   ```

2. **Credit Card Processing**
   - Secure card data entry
   - Real-time authorization
   - Automatic receipt printing
   - PCI compliance maintained

### Payment Reconciliation

#### Daily Reconciliation
1. **Review Daily Deposits**
   - Compare system totals to bank deposits
   - Identify discrepancies
   - Research missing payments
   - Document reconciliation notes

2. **Month-End Reconciliation**
   - Generate monthly payment reports
   - Compare to accounting records
   - Resolve outstanding items
   - Prepare financial statements

## A/R Aging

### Understanding A/R Aging

Accounts Receivable (A/R) Aging shows how long claims have been outstanding:

#### Age Categories
- **0-30 days**: Recently submitted claims
- **31-60 days**: Standard processing timeframe
- **61-90 days**: Requires follow-up
- **90+ days**: Priority collection efforts needed

### A/R Management

#### Reviewing A/R Reports
1. **Access A/R Aging**
   - Navigate to **A/R Aging** section
   - Select date range for analysis
   - Choose grouping options (Provider, Insurance, Patient)

2. **Key Metrics to Monitor**
   ```
   Total A/R Balance: [Outstanding amount]
   Days in A/R: [Average collection time]
   Collection Rate: [Percentage collected]
   Write-off Rate: [Percentage written off]
   ```

#### Follow-up Actions
1. **0-30 Days**
   - Monitor for normal processing
   - Verify claim submission
   - Check for missing information

2. **31-60 Days**
   - Contact insurance for status
   - Resubmit if necessary
   - Verify patient information

3. **61-90 Days**
   - Escalate to supervisor
   - Consider appeal process
   - Review denial reasons

4. **90+ Days**
   - Intensive collection efforts
   - Consider external collections
   - Evaluate write-off options

## Collections

### Collection Workflow

#### Account Prioritization
Accounts are prioritized based on:
- **Balance Amount**: Higher balances get priority
- **Days Outstanding**: Older accounts need attention
- **Payment History**: Previous payment patterns
- **Collection Probability**: Likelihood of collection

#### Collection Activities

##### Patient Communication
1. **Initial Contact**
   - Send patient statements
   - Make courtesy phone calls
   - Offer payment plans
   - Provide payment options

2. **Follow-up Actions**
   ```
   Day 30: First statement sent
   Day 45: Phone call attempt
   Day 60: Second statement with payment plan offer
   Day 75: Final notice before collections
   Day 90: Transfer to external collections
   ```

##### Documentation Requirements
- **Contact Attempts**: Date, time, method, outcome
- **Patient Responses**: Promises to pay, disputes, hardships
- **Payment Arrangements**: Terms, amounts, schedules
- **Collection Actions**: Letters sent, calls made, results

### Collection Tools

#### Payment Plans
1. **Setting Up Plans**
   ```
   Total Balance: [Outstanding amount]
   Down Payment: [Initial payment amount]
   Monthly Payment: [Recurring payment amount]
   Number of Payments: [Plan duration]
   ```

2. **Managing Plans**
   - Monitor payment compliance
   - Send payment reminders
   - Handle missed payments
   - Modify plans as needed

#### Collection Letters
- **Automated Generation**: System-generated letters
- **Customizable Templates**: Organization-specific messaging
- **Compliance Checking**: FDCPA compliance verification
- **Delivery Tracking**: Confirmation of receipt

## Denial Management

### Understanding Denials

#### Common Denial Reasons
- **Missing Information**: Incomplete claim data
- **Authorization Required**: Prior authorization needed
- **Non-Covered Service**: Service not covered by insurance
- **Duplicate Claim**: Claim already processed
- **Timely Filing**: Claim submitted too late

### Denial Processing

#### Reviewing Denials
1. **Access Denial Management**
   - Navigate to **Denials** section
   - Review new denials daily
   - Prioritize by amount and appeal deadline

2. **Denial Analysis**
   ```
   Denial Reason: [Insurance explanation]
   Denial Code: [Specific reason code]
   Appeal Deadline: [Last date to appeal]
   Supporting Documentation: [Required documents]
   ```

#### Appeal Process
1. **Determine Appealability**
   - Review denial reason
   - Check appeal deadline
   - Assess likelihood of success
   - Consider cost vs. benefit

2. **Prepare Appeal**
   ```
   Appeal Letter: [Explanation of disagreement]
   Supporting Documents: [Medical records, authorizations]
   Clinical Notes: [Provider documentation]
   Policy References: [Insurance policy citations]
   ```

3. **Submit Appeal**
   - Follow insurance appeal procedures
   - Track submission confirmation
   - Monitor appeal status
   - Document all communications

### Denial Prevention

#### Common Prevention Strategies
- **Eligibility Verification**: Verify coverage before service
- **Authorization Management**: Obtain required authorizations
- **Accurate Coding**: Use correct diagnosis and procedure codes
- **Complete Documentation**: Ensure all required information is included
- **Timely Submission**: Submit claims within required timeframes

## Reports & Analytics

### Standard Reports

#### Financial Reports
1. **Revenue Summary**
   - Total revenue by period
   - Revenue by provider
   - Revenue by service type
   - Payment method analysis

2. **A/R Aging Report**
   - Outstanding balances by age
   - Collection trends
   - Write-off analysis
   - Provider performance

3. **Payment Analysis**
   - Payment trends over time
   - Payer mix analysis
   - Collection rates
   - Adjustment analysis

#### Operational Reports
1. **Claims Processing**
   - Claims volume by period
   - Processing times
   - Denial rates
   - Resubmission rates

2. **Productivity Reports**
   - User activity summaries
   - Claims per user
   - Collection activities
   - Performance metrics

### Custom Reports

#### Creating Custom Reports
1. **Report Builder**
   - Navigate to **Reports > Custom Reports**
   - Select data sources
   - Choose fields to include
   - Apply filters and grouping
   - Set date ranges

2. **Report Scheduling**
   ```
   Report Name: [Descriptive name]
   Frequency: Daily, Weekly, Monthly
   Recipients: [Email addresses]
   Format: PDF, Excel, CSV
   ```

### Analytics Dashboard

#### Key Performance Indicators
- **Financial KPIs**: Revenue, collection rate, days in A/R
- **Operational KPIs**: Claim volume, processing time, denial rate
- **Quality KPIs**: First-pass rate, appeal success rate

#### Trend Analysis
- **Revenue Trends**: Monthly and yearly comparisons
- **Seasonal Patterns**: Identify seasonal variations
- **Performance Benchmarks**: Compare to industry standards
- **Predictive Analytics**: Forecast future performance

## Settings

### Personal Settings

#### Profile Management
1. **Update Profile Information**
   ```
   Name: [First and Last Name]
   Email: [Contact email]
   Phone: [Contact number]
   Department: [Work department]
   ```

2. **Password Management**
   - Change password regularly
   - Use strong passwords
   - Enable two-factor authentication
   - Set security questions

#### Notification Preferences
Configure notifications for:
- **New Claims**: Claim submissions and updates
- **Payments**: Payment receipts and confirmations
- **Denials**: New denials and appeal deadlines
- **Collections**: Collection activities and reminders
- **System Alerts**: System maintenance and updates

### System Preferences

#### Display Settings
```
Theme: Light, Dark, Auto
Language: English, Spanish, French
Time Zone: [Your local timezone]
Date Format: MM/DD/YYYY, DD/MM/YYYY
Currency: USD, EUR, CAD
```

#### Dashboard Customization
- **Widget Selection**: Choose which widgets to display
- **Layout Options**: Arrange widgets as preferred
- **Default Filters**: Set default report filters
- **Quick Actions**: Customize quick action buttons

## Tips & Best Practices

### Daily Workflow Tips

#### Morning Routine
1. **Check Dashboard**: Review overnight activities and alerts
2. **Process New Claims**: Handle urgent claim submissions
3. **Review Denials**: Address new denials and appeal deadlines
4. **Follow Up on A/R**: Contact insurance companies for outstanding claims
5. **Update Collection Activities**: Document collection efforts and outcomes

#### End-of-Day Tasks
1. **Complete Documentation**: Finish all activity notes
2. **Process Payments**: Post all received payments
3. **Review Pending Items**: Check for incomplete tasks
4. **Prepare Tomorrow's Priorities**: Plan next day's activities
5. **Backup Important Work**: Save critical documents

### Best Practices

#### Claims Management
- **Verify Information**: Double-check all claim data before submission
- **Use Correct Codes**: Ensure accurate diagnosis and procedure codes
- **Submit Timely**: Meet all insurance filing deadlines
- **Track Status**: Monitor claim progress regularly
- **Document Everything**: Keep detailed notes on all activities

#### Payment Processing
- **Reconcile Daily**: Match payments to claims daily
- **Verify Amounts**: Confirm payment amounts match expectations
- **Handle Discrepancies**: Research and resolve payment differences promptly
- **Maintain Security**: Follow all payment security protocols
- **Document Adjustments**: Clearly explain all payment adjustments

#### Collection Activities
- **Be Professional**: Maintain courteous and professional communication
- **Follow Regulations**: Comply with all collection laws and regulations
- **Document Contacts**: Record all patient communications
- **Offer Solutions**: Provide payment options and assistance
- **Know When to Stop**: Recognize when to transfer to external collections

### Keyboard Shortcuts

#### Navigation Shortcuts
- **Ctrl + D**: Go to Dashboard
- **Ctrl + C**: Go to Claims
- **Ctrl + P**: Go to Payments
- **Ctrl + R**: Go to Reports
- **Ctrl + S**: Save current form
- **Ctrl + F**: Search/Find
- **Esc**: Cancel current action

#### Form Shortcuts
- **Tab**: Move to next field
- **Shift + Tab**: Move to previous field
- **Enter**: Submit form (when applicable)
- **Ctrl + Enter**: Quick save
- **F1**: Help for current screen

### Getting Help

#### Built-in Help
- **Help Menu**: Access comprehensive help documentation
- **Tooltips**: Hover over fields for quick explanations
- **Video Tutorials**: Watch step-by-step video guides
- **FAQ Section**: Find answers to common questions

#### Support Resources
- **Help Desk**: Contact internal IT support
- **User Manual**: Comprehensive system documentation
- **Training Materials**: Additional learning resources
- **User Community**: Connect with other system users

#### Contact Information
```
Help Desk: helpdesk@organization.com
Training Team: training@organization.com
System Administrator: admin@organization.com
Emergency Support: +1-800-HELP-RCM
```

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: April 2024  
**Document Owner**: Training Team