# Enhanced Billing System Integration Guide

## Overview

The enhanced billing system has been integrated into your existing billing routes at `/api/billing/`. All new functionality is backward compatible with your existing system.

## Quick Setup

### 1. Run Integration Script
```bash
node integrate-enhanced-billing.cjs
```

### 2. Test the System
```bash
node test-enhanced-billing-system.cjs
```

### 3. Import Postman Collection
Import `Enhanced_Billing_System.postman_collection.json` into Postman with base URL: `http://localhost:3000/api/billing`

## API Endpoints

### Bills Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/bills` | Create new bill |
| GET | `/api/billing/bills` | Get all bills (paginated) |
| GET | `/api/billing/bills/:id` | Get bill details |
| PUT | `/api/billing/bills/:id/items` | Update bill items |
| PATCH | `/api/billing/bills/:id/status` | Update bill status |
| POST | `/api/billing/bills/:id/invoice` | Generate invoice from bill |

### Invoice Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/invoices` | Get all invoices (with filters) |
| GET | `/api/billing/invoices/:id` | Get invoice details |
| PATCH | `/api/billing/invoices/:id/status` | Update invoice status |
| POST | `/api/billing/invoices/:id/cancel` | Cancel invoice |

### Payment Processing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/invoices/:id/payments` | Record payment |
| GET | `/api/billing/invoices/:id/payments` | Get payment history |
| POST | `/api/billing/payments/:id/void` | Void payment |

### Reports & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/reports/aging` | A/R aging report |

### Utility Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/services` | Get all services |
| GET | `/api/billing/patients` | Get all patients |
| GET | `/api/billing/patients/search` | Search patients |

## Sample Requests

### Create Bill
```json
POST /api/billing/bills
{
  "patient_id": 100,
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

### Generate Invoice
```json
POST /api/billing/bills/1/invoice
{
  "due_in_days": 30
}
```

### Record Payment
```json
POST /api/billing/invoices/1/payments
{
  "amount_paid": 150.00,
  "payment_method": "card",
  "transaction_id": "txn_123",
  "reference_number": "REF001",
  "payment_gateway": "stripe",
  "notes": "Payment via credit card",
  "created_by": 1
}
```

## Key Features

### ✅ Enhanced Invoice Numbering
- Format: `INV-2025-0001`
- Sequential, gap-free numbering
- Automatic year rollover

### ✅ Smart Payment Processing
- Partial and full payment support
- Automatic status updates
- Multiple payment gateways
- Payment history tracking

### ✅ Comprehensive Reporting
- A/R aging analysis
- Invoice summaries
- Payment analytics

### ✅ Data Integrity
- Database triggers for automatic updates
- Transaction safety
- Validation at API level
- Immutable invoices once finalized

## Backward Compatibility

All existing endpoints continue to work:
- `GET /api/billing/get-all-bills` (legacy)
- `POST /api/billing/invoices/:bill_id/generate` (legacy)
- `POST /api/billing/payments` (legacy)
- `POST /api/billing/search-patients` (legacy)

## Status Values

### Bill Status
- `draft` - Editable bill
- `finalized` - Converted to invoice
- `cancelled` - Cancelled bill

### Invoice Status
- `pending` - Awaiting payment
- `partially_paid` - Partial payment received
- `paid` - Fully paid
- `overdue` - Past due date
- `cancelled` - Cancelled invoice

### Payment Methods
- `cash`, `card`, `check`, `bank_transfer`, `insurance`, `online`

### Payment Gateways
- `stripe`, `square`, `paypal`, `authorize_net`, `manual`

## Error Handling

The system provides detailed error messages for:
- Validation errors
- Business rule violations
- Database constraints
- Payment processing issues

## Testing

### Run Full Test Suite
```bash
node test-enhanced-billing-system.cjs
```

### Test Specific Scenarios
```bash
node test-enhanced-billing-system.cjs --errors
```

### Generate Postman Collection
```bash
node test-enhanced-billing-system.cjs --postman
```

## Database Schema

The enhanced schema includes:
- **bills** - Draft bills
- **bill_items** - Bill line items
- **invoices** - Finalized invoices
- **invoice_items** - Invoice line items (immutable)
- **payments** - Payment records
- **invoice_sequences** - Invoice numbering
- **Views** - aging_report, invoice_summary

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify database schema is properly applied
3. Ensure all required services and patients exist
4. Test with the provided sample data

The system is designed to be robust and handle edge cases gracefully while maintaining data integrity throughout the billing workflow.