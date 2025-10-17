// Simple test to check bill payment status without database connection issues
console.log('=== Bill Payment Status Test ===');

// Mock data to simulate the issue
const mockBill = {
    id: 1,
    patient_id: 123,
    total_amount: 100.00,
    amount_paid: 50.00,  // Bill has $50 paid
    patient_name: 'John Doe',
    notes: 'Test bill'
};

const mockInvoice = {
    id: 1,
    invoice_number: 'INV-2025-0001',
    bill_id: 1,
    patient_id: 123,
    total_amount: 100.00,
    amount_paid: 0.00,  // Issue: Invoice shows $0 paid instead of $50
    balance_due: 100.00,
    status: 'pending'
};

console.log('Bill Status:');
console.log('- Total Amount:', mockBill.total_amount);
console.log('- Amount Paid:', mockBill.amount_paid);
console.log('- Amount Due:', mockBill.total_amount - mockBill.amount_paid);

console.log('\nInvoice Status (CURRENT ISSUE):');
console.log('- Total Amount:', mockInvoice.total_amount);
console.log('- Amount Paid:', mockInvoice.amount_paid, '← SHOULD BE', mockBill.amount_paid);
console.log('- Balance Due:', mockInvoice.balance_due, '← SHOULD BE', mockBill.total_amount - mockBill.amount_paid);
console.log('- Status:', mockInvoice.status, '← SHOULD BE "partially_paid"');

console.log('\nExpected Invoice Status (AFTER FIX):');
console.log('- Total Amount:', mockInvoice.total_amount);
console.log('- Amount Paid:', mockBill.amount_paid);
console.log('- Balance Due:', mockBill.total_amount - mockBill.amount_paid);
console.log('- Status: partially_paid');

console.log('\n=== Solution Applied ===');
console.log('1. ✅ Updated generateInvoice() to copy bill.amount_paid to invoice');
console.log('2. ✅ Updated generateInvoice() to migrate bill payments to invoice');
console.log('3. ✅ Database triggers should update invoice status automatically');

console.log('\n=== Next Steps ===');
console.log('1. Apply database migration: update-payments-table.sql');
console.log('2. Test invoice generation with a bill that has payments');
console.log('3. Verify invoice shows correct amount_paid and status');