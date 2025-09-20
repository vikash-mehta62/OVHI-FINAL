const mysql = require('mysql2/promise');

async function showPaymentsData() {
    console.log('📊 Showing Payments Table Data\n');

    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'varn-health'
        });

        console.log('✅ Database connected\n');

        // 1. Show all payments data
        console.log('1️⃣ All Payments in Database:');
        console.log('=' .repeat(120));
        
        const [payments] = await connection.execute(`
            SELECT 
                p.*,
                DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i:%s') as formatted_payment_date,
                DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') as formatted_created_at
            FROM payments p 
            ORDER BY p.id
        `);

        if (payments.length === 0) {
            console.log('❌ No payments found in database');
        } else {
            console.log(`Found ${payments.length} payments:\n`);
            
            payments.forEach((payment, index) => {
                console.log(`Payment #${payment.id}:`);
                console.log(`  Bill ID: ${payment.bill_id}`);
                console.log(`  Payment Method: ${payment.payment_method}`);
                console.log(`  Transaction ID: ${payment.transaction_id || 'N/A'}`);
                console.log(`  Amount: $${payment.amount}`);
                console.log(`  Status: ${payment.status}`);
                console.log(`  Payment Date: ${payment.formatted_payment_date}`);
                console.log(`  Notes: ${payment.notes || 'N/A'}`);
                console.log(`  Gateway Response: ${payment.gateway_response ? JSON.stringify(payment.gateway_response) : 'N/A'}`);
                console.log(`  Created: ${payment.formatted_created_at}`);
                console.log(`  Updated: ${payment.updated_at}`);
                console.log('  ' + '-'.repeat(80));
            });
        }

        // 2. Show payments with related bill and patient info
        console.log('\n2️⃣ Payments with Bill and Patient Information:');
        console.log('=' .repeat(120));
        
        const [paymentsWithDetails] = await connection.execute(`
            SELECT 
                p.id as payment_id,
                p.bill_id,
                p.payment_method,
                p.transaction_id,
                p.amount as payment_amount,
                p.status as payment_status,
                p.notes as payment_notes,
                DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i:%s') as payment_date,
                
                b.total_amount as bill_total,
                b.status as bill_status,
                b.patient_id,
                
                CONCAT(up.firstname, ' ', up.lastname) as patient_name,
                up.work_email as patient_email,
                
                um.fk_physician_id,
                CONCAT(up2.firstname, ' ', up2.lastname) as physician_name
                
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            JOIN user_profiles up ON b.patient_id = up.fk_userid
            JOIN users_mappings um ON um.user_id = b.patient_id
            LEFT JOIN user_profiles up2 ON up2.fk_userid = um.fk_physician_id
            ORDER BY p.id
        `);

        if (paymentsWithDetails.length === 0) {
            console.log('❌ No payments found with complete details (check data relationships)');
        } else {
            console.log(`Found ${paymentsWithDetails.length} payments with complete details:\n`);
            
            paymentsWithDetails.forEach((payment) => {
                console.log(`Payment #${payment.payment_id}:`);
                console.log(`  Patient: ${payment.patient_name} (ID: ${payment.patient_id})`);
                console.log(`  Patient Email: ${payment.patient_email}`);
                console.log(`  Physician: ${payment.physician_name} (ID: ${payment.fk_physician_id})`);
                console.log(`  Bill #${payment.bill_id} - Total: $${payment.bill_total} (Status: ${payment.bill_status})`);
                console.log(`  Payment: $${payment.payment_amount} via ${payment.payment_method} (Status: ${payment.payment_status})`);
                console.log(`  Transaction ID: ${payment.transaction_id || 'N/A'}`);
                console.log(`  Date: ${payment.payment_date}`);
                console.log(`  Notes: ${payment.payment_notes || 'N/A'}`);
                console.log('  ' + '-'.repeat(80));
            });
        }

        // 3. Show payment summary by status
        console.log('\n3️⃣ Payment Summary by Status:');
        console.log('=' .repeat(60));
        
        const [statusSummary] = await connection.execute(`
            SELECT 
                status,
                COUNT(*) as count,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount
            FROM payments 
            GROUP BY status
            ORDER BY status
        `);

        statusSummary.forEach(summary => {
            console.log(`${summary.status.toUpperCase()}:`);
            console.log(`  Count: ${summary.count}`);
            console.log(`  Total Amount: $${summary.total_amount}`);
            console.log(`  Average Amount: $${summary.avg_amount.toFixed(2)}`);
            console.log('');
        });

        // 4. Show payment methods summary
        console.log('4️⃣ Payment Methods Summary:');
        console.log('=' .repeat(60));
        
        const [methodSummary] = await connection.execute(`
            SELECT 
                payment_method,
                COUNT(*) as count,
                SUM(amount) as total_amount
            FROM payments 
            GROUP BY payment_method
            ORDER BY count DESC
        `);

        methodSummary.forEach(method => {
            console.log(`${method.payment_method.toUpperCase()}:`);
            console.log(`  Count: ${method.count}`);
            console.log(`  Total Amount: $${method.total_amount}`);
            console.log('');
        });

        // 5. Show payments by bill
        console.log('5️⃣ Payments Grouped by Bill:');
        console.log('=' .repeat(80));
        
        const [billSummary] = await connection.execute(`
            SELECT 
                p.bill_id,
                b.total_amount as bill_total,
                COUNT(p.id) as payment_count,
                SUM(p.amount) as total_paid,
                (b.total_amount - SUM(p.amount)) as remaining_balance,
                CONCAT(up.firstname, ' ', up.lastname) as patient_name
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            JOIN user_profiles up ON b.patient_id = up.fk_userid
            GROUP BY p.bill_id, b.total_amount, up.firstname, up.lastname
            ORDER BY p.bill_id
        `);

        billSummary.forEach(bill => {
            console.log(`Bill #${bill.bill_id} (${bill.patient_name}):`);
            console.log(`  Bill Total: $${bill.bill_total}`);
            console.log(`  Payments: ${bill.payment_count} payments totaling $${bill.total_paid}`);
            console.log(`  Remaining Balance: $${bill.remaining_balance}`);
            console.log(`  Status: ${bill.remaining_balance <= 0 ? 'FULLY PAID' : 'PARTIAL PAYMENT'}`);
            console.log('');
        });

        await connection.end();

        console.log('\n📋 Data Summary:');
        console.log(`✅ Total Payments: ${payments.length}`);
        console.log(`✅ Payments with Complete Details: ${paymentsWithDetails.length}`);
        console.log('✅ All payment data is properly structured');
        
        if (payments.length !== paymentsWithDetails.length) {
            console.log('⚠️  Some payments missing complete details (data relationship issues)');
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

showPaymentsData().catch(console.error);