# Enhanced Bills-to-Invoices System Documentation

## Overview

This enhanced billing system provides a complete workflow from draft bills to finalized invoices with comprehensive payment tracking. The system ensures data integrity, supports partial payments, and provides robust reporting capabilities.

## System Architecture

### Database Schema Design

#### Core Tables

1. **bills** - Draft bills before finalization
   - Mutable until converted to invoice
   - Supports status tracking (draft, finalized, cancelled)
   - Calculated total_amount field

2. **bill_items** - Line items for draft bills
   - Links to services table for current pricing
   - Supports quantity and unit_price modifications
   - Generated line_total field for performance

3. **invoices** - Finalized bills ready for payment
   - Immutable once created (except status updates)
   - Unique invoice numbering system
   - Automatic due date calculation
   - Generated balance_due field

4. **invoice_items** - Snapshot of services at invoice time
   - Immutable line items with service details
   - Preserves service names and codes at time of invoice
   - Protects against service changes affecting historical data

5. **payments** - Payment records against invoices
   - Supports multiple payment methods and gateways
   - Tracks transaction IDs and reference numbers
   - Automatic invoice status updates via triggers

6. **invoice_sequences** - Invoice number generation
   - Ensures unique sequential numbering per year
   - Thread-safe with database locks

#### Key Relationships

```
bills (1) → (many) bill_items
bills (1) → (1) invoices
invoices (1) → (many) invoice_items
invoices (1) → (many) payments
```

#### Database Triggers

- **Automatic Status Updates**: Invoice status automatically updates based on payment totals
- **Balance Calculation**: Real-time balance_due calculation
- **Payment Validation**: Ensures payment integrity

### Invoice Numbering System

**Format**: `INV-YYYY-NNNN`
- **INV**: Fixed prefix
- **YYYY**: Current year
- **NNNN**: Sequential number (padded to 4 digits)

**Examples**:
- `INV-2025-0001` (First invoice of 2025)
- `INV-2025-0234` (234th invoice of 2025)

**Features**:
- Thread-safe generation using database locks
- Automatic year rollover
- Gap-free sequential numbering

### Due Date Management

**Default**: 30 days from invoice issue date
**Configurable**: Can be customized per invoice
**Automatic**: Calculated during invoice generation

## API Endpoints

### Bills Management

#### Create Bill
```http
POST /api/bills
Content-Type: application/json

{
  "patient_id": 1,
  "items": [
    {
      "service_id": 1,
      "quantity": 1,
      "unit_price": 150.00
    }
  ],
  "notes": "Initial consultation",
  "created_by": 1
}
```

#### Get All Bills
```http
GET /api/bills?limit=20&offset=0
```

#### Get Bill Details
```http
GET /api/bills/{id}
```

#### Update Bill Items
```http
PUT /api/bills/{id}/items
Content-Type: application/json

{
  "items": [
    {
      "service_id": 1,
      "quantity": 2,
      "unit_price": 175.00
    }
  ]
}
```

#### Generate Invoice from Bill
```http
POST /api/bills/{id}/invoice
Content-Type: application/json

{
  "due_in_days": 30
}
```

### Invoice Management

#### Get All Invoices
```http
GET /api/invoices?status=pending&limit=20
```

#### Get Invoice Details
```http
GET /api/invoices/{id}
```

#### Update Invoice Status
```http
PUT /api/invoices/{id}/status
Content-Type: application/json

{
  "status": "overdue"
}
```

#### Cancel Invoice
```http
POST /api/invoices/{id}/cancel
Content-Type: application/json

{
  "reason": "Patient requested cancellation"
}
```

### Payment Processing

#### Record Payment
```http
POST /api/invoices/{id}/payments
Content-Type: application/json

{
  "amount_paid": 150.00,
  "payment_method": "card",
  "transaction_id": "txn_1234567890",
  "reference_number": "REF001",
  "payment_gateway": "stripe",
  "gateway_transaction_id": "pi_1234567890",
  "notes": "Payment via credit card",
  "created_by": 1
}
```

#### Get Payment History
```http
GET /api/invoices/{id}/payments
```

#### Void Payment
```http
POST /api/payments/{id}/void
Content-Type: application/json

{
  "reason": "Duplicate payment - refunding"
}
```

### Reporting

#### Aging Report
```http
GET /api/reports/aging?patient_id=1
```

#### Overdue Invoices
```http
GET /api/invoices?overdue_only=true
```

## Status Management

### Bill Statuses
- **draft**: Editable bill, can modify items and amounts
- **finalized**: Bill converted to invoice, no longer editable
- **cancelled**: Bill cancelled before invoice generation

### Invoice Statuses
- **pending**: Awaiting payment
- **partially_paid**: Some payment received, balance remaining
- **paid**: Fully paid
- **overdue**: Past due date with outstanding balance
- **cancelled**: Invoice cancelled (only if no payments)

### Payment Methods
- **cash**: Cash payment
- **card**: Credit/debit card
- **check**: Paper check
- **bank_transfer**: ACH/wire transfer
- **insurance**: Insurance payment
- **online**: Online payment portal

### Payment Gateways
- **stripe**: Stripe payment processing
- **square**: Square payment processing
- **paypal**: PayPal payment processing
- **authorize_net**: Authorize.Net processing
- **manual**: Manual payment entry

## Best Practices

### Database Indexing

**Recommended Indexes**:
```sql
-- Performance indexes
CREATE INDEX idx_bills_patient_id ON bills(patient_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_created_at ON bills(created_at);

CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
CREATE INDEX idx_payments_method ON payments(payment_method);
```

### Data Integrity

#### Immutability Rules
1. **Invoices**: Once created, line items cannot be modified
2. **Invoice Items**: Preserve service details at time of invoice
3. **Payments**: Cannot be modified, only voided/refunded

#### Validation Rules
1. **Payment Amount**: Cannot exceed remaining invoice balance
2. **Bill Status**: Cannot generate invoice from finalized bill
3. **Invoice Cancellation**: Cannot cancel paid invoices

#### Audit Trail
- All tables include created_at and updated_at timestamps
- Payment records include created_by for accountability
- Void/cancellation reasons stored in notes fields

### Error Handling

#### Common Scenarios
1. **Overpayment Prevention**: Validate payment amount against remaining balance
2. **Duplicate Invoice Prevention**: Check for existing invoice before generation
3. **Status Validation**: Ensure valid status transitions
4. **Concurrent Access**: Use database transactions for critical operations

#### Error Messages
- Clear, actionable error messages
- Validation errors include field-specific details
- Business rule violations explain constraints

### Performance Optimization

#### Query Optimization
1. Use database views for complex reporting queries
2. Implement proper indexing strategy
3. Use connection pooling for database access
4. Paginate large result sets

#### Caching Strategy
1. Cache frequently accessed service data
2. Cache patient lookup results
3. Use Redis for session-based data

## Security Considerations

### Data Protection
1. **Encryption**: Sensitive data encrypted at rest and in transit
2. **Access Control**: Role-based access to billing functions
3. **Audit Logging**: Track all financial transactions
4. **PCI Compliance**: Secure payment data handling

### Authentication & Authorization
1. **JWT Tokens**: Secure API access
2. **Role Validation**: Verify user permissions for operations
3. **Rate Limiting**: Prevent API abuse
4. **Input Validation**: Sanitize all user inputs

## Testing Strategy

### Unit Tests
- Service layer business logic
- Validation functions
- Calculation methods

### Integration Tests
- API endpoint functionality
- Database transaction integrity
- Payment processing workflows

### End-to-End Tests
- Complete bill-to-payment workflow
- Error scenario handling
- Performance under load

## Deployment Considerations

### Environment Setup
1. **Database Migration**: Run schema updates safely
2. **Environment Variables**: Secure configuration management
3. **Monitoring**: Track system health and performance
4. **Backup Strategy**: Regular database backups

### Scaling Considerations
1. **Database Sharding**: Partition by patient or date ranges
2. **Read Replicas**: Separate read/write operations
3. **Microservices**: Split billing into focused services
4. **Queue Processing**: Async payment processing

## Troubleshooting Guide

### Common Issues

#### Invoice Generation Fails
- **Check**: Bill status is 'draft'
- **Check**: Bill has valid items with prices
- **Check**: Patient exists and is active

#### Payment Recording Fails
- **Check**: Invoice exists and is not cancelled
- **Check**: Payment amount doesn't exceed balance
- **Check**: Payment method is valid

#### Status Not Updating
- **Check**: Database triggers are enabled
- **Check**: Payment amounts are correct
- **Check**: No concurrent transactions

### Monitoring Metrics
1. **Invoice Generation Rate**: Track conversion from bills
2. **Payment Success Rate**: Monitor payment failures
3. **Aging Report Trends**: Track outstanding balances
4. **API Response Times**: Monitor performance

## Future Enhancements

### Planned Features
1. **Recurring Billing**: Subscription-based invoicing
2. **Payment Plans**: Installment payment support
3. **Automated Reminders**: Email/SMS payment reminders
4. **Advanced Reporting**: Custom report builder
5. **Integration APIs**: Third-party accounting systems

### Scalability Improvements
1. **Event-Driven Architecture**: Async processing
2. **Microservices Split**: Separate billing domains
3. **API Versioning**: Backward compatibility
4. **Multi-Tenant Support**: Practice isolation

## Support & Maintenance

### Regular Tasks
1. **Database Cleanup**: Archive old records
2. **Performance Monitoring**: Query optimization
3. **Security Updates**: Dependency management
4. **Backup Verification**: Test restore procedures

### Contact Information
- **Technical Support**: [support@ovhi.com]
- **Documentation**: [docs.ovhi.com/billing]
- **API Reference**: [api.ovhi.com/billing]