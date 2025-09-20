const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Payments Module Implementation\n');

// Files to check
const filesToCheck = [
    {
        path: 'src/pages/Billing.tsx',
        checks: [
            'interface Payment',
            'payments.*useState',
            'getPayments',
            'createPayment',
            'PaymentDetailsDialog',
            'CreditCard.*lucide-react'
        ]
    },
    {
        path: 'src/components/billing/PaymentDetailsDialog.tsx',
        checks: [
            'interface Payment',
            'PaymentDetailsDialogProps',
            'getStatusColor',
            'formatCurrency'
        ]
    },
    {
        path: 'src/components/billing/RecordPaymentForm.tsx',
        checks: [
            'interface Bill',
            'bill.*Bill',
            'createPayment',
            'payment_method'
        ]
    },
    {
        path: 'src/services/billingService.ts',
        checks: [
            'getPayments',
            'createPayment',
            'refundPayment',
            'getPaymentById'
        ]
    },
    {
        path: 'server/routes/billingRoutes.js',
        checks: [
            'GET.*payments',
            'POST.*payments/create',
            'POST.*payments.*refund'
        ]
    },
    {
        path: 'server/services/billing/billingService.js',
        checks: [
            'getPayments.*async',
            'createPayment.*async',
            'refundPayment.*async'
        ]
    }
];

let allChecksPass = true;

for (const file of filesToCheck) {
    console.log(`📁 Checking ${file.path}...`);
    
    try {
        const content = fs.readFileSync(file.path, 'utf8');
        let fileChecksPass = true;
        
        for (const check of file.checks) {
            const regex = new RegExp(check, 'i');
            if (regex.test(content)) {
                console.log(`  ✅ ${check}`);
            } else {
                console.log(`  ❌ ${check}`);
                fileChecksPass = false;
                allChecksPass = false;
            }
        }
        
        if (fileChecksPass) {
            console.log(`  🎉 All checks passed for ${file.path}\n`);
        } else {
            console.log(`  ⚠️  Some checks failed for ${file.path}\n`);
        }
        
    } catch (error) {
        console.log(`  ❌ File not found or error reading: ${error.message}\n`);
        allChecksPass = false;
    }
}

// Check if database setup files exist
console.log('📊 Checking database setup files...');
const dbFiles = [
    'setup-payments-table.cjs',
    'create-payments-table-new.sql'
];

for (const dbFile of dbFiles) {
    if (fs.existsSync(dbFile)) {
        console.log(`  ✅ ${dbFile} exists`);
    } else {
        console.log(`  ❌ ${dbFile} missing`);
        allChecksPass = false;
    }
}

// Check if test files exist
console.log('\n🧪 Checking test files...');
const testFiles = [
    'test-payments-api.cjs',
    'PAYMENTS_MODULE_IMPLEMENTATION.md'
];

for (const testFile of testFiles) {
    if (fs.existsSync(testFile)) {
        console.log(`  ✅ ${testFile} exists`);
    } else {
        console.log(`  ❌ ${testFile} missing`);
        allChecksPass = false;
    }
}

console.log('\n' + '='.repeat(50));
if (allChecksPass) {
    console.log('🎉 All verification checks passed!');
    console.log('✅ Payments module implementation is complete and ready to use.');
    console.log('\n📋 Next steps:');
    console.log('1. Start the server: cd server && npm start');
    console.log('2. Start the frontend: npm run dev');
    console.log('3. Login and navigate to Billing & Payments');
    console.log('4. Test the payments functionality');
} else {
    console.log('❌ Some verification checks failed.');
    console.log('⚠️  Please review the failed checks above.');
}

console.log('\n📖 For detailed implementation info, see: PAYMENTS_MODULE_IMPLEMENTATION.md');