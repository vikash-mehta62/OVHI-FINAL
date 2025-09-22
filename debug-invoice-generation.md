# Invoice Generation Debug

## Current Flow:
1. Frontend calls: `POST /api/billings/invoices/{billId}/generate`
2. Backend route: `router.post('/invoices/:bill_id/generate', ...)`
3. Backend method: `billingService.generateInvoice(billId)`

## The Issue:
When generating an invoice from a bill that has payments, the invoice shows `amount_paid: 0` instead of the actual paid amount.

## Root Cause Analysis:

### Current generateInvoice method:
```javascript
// Create invoice
const [invoiceResult] = await conn.query(`
    INSERT INTO invoices (invoice_number, bill_id, patient_id, total_amount, amount_paid, due_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`, [invoiceNumber, billId, bill.patient_id, bill.total_amount, bill.amount_paid || 0, dueDate, bill.notes]);

// Migrate bill payments to invoice payments
await conn.query(`
    UPDATE payments 
    SET invoice_id = ?, bill_id = NULL 
    WHERE bill_id = ?
`, [invoiceId, billId]);
```

### The Fix:
1. ✅ Copy `bill.amount_paid` to `invoice.amount_paid` when creating invoice
2. ✅ Migrate bill payments to invoice payments by updating `payments` table
3. ✅ The invoice triggers should automatically update the status based on payments

## Expected Behavior:
- Bill with $100 total, $50 paid → Invoice with $100 total, $50 paid, $50 due
- Invoice status should be 'partially_paid'
- Payments should be linked to invoice_id instead of bill_id

## Testing Steps:
1. Create a bill with payments
2. Generate invoice from the bill
3. Check that invoice.amount_paid matches bill.amount_paid
4. Check that payments are now linked to invoice_id
5. Check that invoice status is correct (partially_paid/paid)