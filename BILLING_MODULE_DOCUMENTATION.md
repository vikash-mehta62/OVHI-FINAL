# Patient Billing & Invoice Module Documentation

## Overview

The Patient Billing & Invoice Module is a comprehensive healthcare billing system that handles the complete billing workflow from draft bills to invoice generation, payment processing, and revenue tracking.

## Features

### Core Functionality
- **Bill Management**: Create and manage draft bills with multiple services
- **Invoice Generation**: Convert bills to finalized invoices with unique invoice numbers
- **Payment Processing**: Record payments against invoices with multiple payment methods
- **Status Tracking**: Track invoice status (pending, paid, overdue, discarded)
- **Revenue Analytics**: Dashboard with revenue summaries and KPIs

### User Interface
- **Billing Dashboard**: Overview of all invoices with filtering and search
- **Create Bill Form**: Interactive form to add services and calculate totals
- **Invoice Preview**: Professional invoice layout with print/download options
- **Payment Recording**: Easy payment entry with method-specific fields

## Database Schema

### Tables Structure

#### `services`
- Medical services catalog with pricing
- Fields: service_id, name, description, cpt_codes, price, created_at

#### `patients`
- Patient demographic and insurance information
- Fields: id, name, email, phone, date_of_birth, address, insurance_provider, insurance_id

#### `bills`
- Draft bills before finalization
- Fields: id, patient_id, status, total_amount, notes, created_by

#### `invoices`
- Finalized invoices from bills
- Fields: id, invoice_number, bill_id, patient_id, status, total_amount, amount_paid, amount_due, due_date

#### `bill_items` / `invoice_items`
- Line items for bills and invoices
- Fields: id, bill_id/invoice_id, service_id, service_name, quantity, unit_price, line_total

#### `payments`
- Payment records against invoices
- Fields: id, invoice_id, amount_paid, payment_method, transaction_id, reference_number, paid_at

## API Endpoints

### Bills
- `POST /api/v1/billings/bills` - Create new bill draft
- `GET /api/v1/billings/bills/:id` - Get bill details with items

### Invoices
- `POST /api/v1/billings/invoices/:bill_id/generate` - Generate invoice from bill
- `GET /api/v1/billings/invoices/:id` - Get invoice details with items and payments
- `GET /api/v1/billings/invoices` - List all invoices with filters
- `PATCH /api/v1/billings/invoices/:id/status` - Update invoice status

### Payments
- `POST /api/v1/billings/payments` - Record payment against invoice

### Reference Data
- `GET /api/v1/billings/services` - Get all services with service_id, name, description, cpt_codes, price
- `GET /api/v1/billings/patients` - Get all patients
- `POST /api/v1/billings/search-patients` - Search patients by name, email, phone, DOB (returns patient_id, patient_name)

## Frontend Components

### Main Components
- **`Billing.tsx`** - Main dashboard page
- **`CreateBillForm.tsx`** - Bill creation form with patient search dropdown
- **`InvoicePreview.tsx`** - Invoice display and actions
- **`RecordPaymentForm.tsx`** - Payment recording form

### Services
- **`billingService.ts`** - API service layer with TypeScript interfaces and authentication

### Patient Search Features (Material-UI Autocomplete)
- **MUI Autocomplete**: Professional search dropdown with Material Design
- **Real-time Search**: Updates as user types with API integration
- **Free Solo Input**: Allows flexible text input and selection
- **Custom Rendering**: Shows patient name and ID in dropdown options
- **Minimum Characters**: Requires 2+ characters to trigger search
- **Authentication**: All requests include JWT token from cookies
- **Error Handling**: Graceful handling of search failures

## Patient Search Implementation

### Backend Search Endpoint
```javascript
// POST /api/v1/billings/search-patients
{
  "searchTerm": "John"
}

// Response
{
  "success": true,
  "data": [
    {
      "patient_id": 123,
      "patient_name": "John Doe"
    }
  ]
}
```

### Frontend Search Component (Material-UI)
```typescript
// MUI Autocomplete with real-time search
<Autocomplete
  value={selectedPatient}
  onChange={(event, newValue) => {
    if (typeof newValue === 'string') {
      setSelectedPatient({ patient_name: newValue });
    } else if (newValue && newValue.inputValue) {
      setSelectedPatient({ patient_name: newValue.inputValue });
    } else {
      setSelectedPatient(newValue);
    }
  }}
  filterOptions={(options, params) => {
    const filtered = filter(options, params);
    const { inputValue } = params;
    
    // Trigger search when user types
    if (inputValue.length >= 2) {
      searchPatients(inputValue);
    }
    
    return filtered;
  }}
  options={patientOptions}
  getOptionLabel={(option) => option.patient_name}
  renderOption={(props, option) => (
    <li {...props}>
      {option.patient_name}
      {option.patient_id && (
        <span className="text-gray-500 text-sm ml-2">
          (ID: {option.patient_id})
        </span>
      )}
    </li>
  )}
  freeSolo
  renderInput={(params) => (
    <TextField 
      {...params} 
      label="Search and select patient" 
      placeholder="Type patient name, email, or phone..."
    />
  )}
/>
```

### Search Features
- **Multi-field Search**: Searches firstname, lastname, email, phone, DOB
- **Minimum Length**: Requires 2+ characters to prevent excessive queries
- **Debounced**: 300ms delay to optimize performance
- **Limit Results**: Returns maximum 10 results for performance
- **Real-time**: Updates as user types

## Setup Instructions

### 1. Database Setup
```bash
# Run the setup script to create tables and sample data
node setup-billing-system.js
```

### 2. Backend Setup
```bash
# Install dependencies (if not already done)
cd server
npm install

# Start the server
npm run dev
```

### 3. Frontend Setup
```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

### 4. Environment Configuration
Ensure your `.env` file includes:
```
VITE_API_URL=http://localhost:8000/api/v1
```

## Testing

### Automated Testing
```bash
# Run the test suite
node test-billing-system.js
```

### Manual Testing
1. Navigate to `/billing` in your browser
2. Create a new bill with services
3. Generate an invoice from the bill
4. Record a payment against the invoice
5. Verify status updates and calculations

## Sample Data

The system includes sample data:
- **8 Services**: Medical services with CPT codes and pricing (service_id, name, description, cpt_codes, price)
- **5 Patients**: Sample patient records with insurance information
- **Sample Bills/Invoices**: Pre-created for testing and demonstration
- **Patient Search**: Integrated search functionality that searches across patient names, emails, phone numbers, and DOB

## Payment Methods Supported

- **Cash**: Direct cash payments
- **Card**: Credit/debit card payments with transaction ID
- **Check**: Check payments with check number
- **Bank Transfer**: Electronic transfers with reference number
- **Insurance**: Insurance claim payments

## Status Workflow

### Bill Status
- `draft` → `finalized` (when invoice is generated)

### Invoice Status
- `pending` → `paid` (when fully paid)
- `pending` → `overdue` (manual status update)
- `pending` → `discarded` (manual cancellation)

## Key Features

### Automatic Calculations
- Line totals calculated from quantity × unit price
- Bill/invoice totals auto-calculated from line items
- Amount due calculated as total - amount paid

### Invoice Numbering
- Auto-generated format: `INV-YYYY-NNNN`
- Sequential numbering by year
- Unique constraint prevents duplicates

### Data Integrity
- Foreign key constraints maintain referential integrity
- Generated columns for calculated fields
- Transaction support for multi-table operations

### User Experience
- Real-time total calculations
- Responsive design with Tailwind CSS
- Professional invoice layout
- Intuitive filtering and search

## Integration Points

### Existing OVHI Modules
- **Patient Management**: Uses existing patient data
- **Authentication**: Integrates with existing auth system
- **Settings**: Follows existing UI patterns

### External Systems
- Ready for payment gateway integration (Stripe, Square, etc.)
- PDF generation capability for invoice downloads
- Email integration for invoice delivery

## Security Considerations

- All routes protected with authentication middleware
- Input validation on all forms
- SQL injection prevention with parameterized queries
- XSS protection with proper data sanitization

## Performance Optimizations

- Database indexes on frequently queried columns
- Connection pooling for database operations
- Efficient queries with proper joins
- Pagination support for large datasets

## Future Enhancements

### Planned Features
- PDF invoice generation
- Email invoice delivery
- Recurring billing support
- Payment gateway integration
- Advanced reporting and analytics
- Bulk operations support

### Integration Opportunities
- Insurance claim submission
- Electronic health records integration
- Accounting system synchronization
- Patient portal access

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify MySQL is running
   - Check database credentials in server/.env
   - Ensure database exists

2. **API Errors**
   - Verify server is running on correct port
   - Check CORS configuration
   - Validate request data format

3. **Frontend Issues**
   - Verify API_URL environment variable
   - Check browser console for errors
   - Ensure all dependencies are installed

### Debug Mode
Enable detailed logging by setting:
```
NODE_ENV=development
```

## Support

For technical support or questions about the billing module:
1. Check the troubleshooting section
2. Review API documentation
3. Test with the provided test script
4. Verify sample data is properly loaded

## Version History

- **v1.0.0** - Initial release with core billing functionality
- Complete bill-to-invoice workflow
- Payment processing and tracking
- Professional invoice preview
- Comprehensive dashboard with analytics