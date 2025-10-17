const mysql = require('mysql2/promise');

async function createConnection() {
    return await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'varn-health',
        port: process.env.DB_PORT || 3306
    });
}

async function setupPaymentsTable() {
    const connection = await createConnection();
    
    try {
        console.log('🔄 Setting up payments table...');

        // Create payments table
        const createPaymentsTable = `
            CREATE TABLE IF NOT EXISTS \`payments\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`bill_id\` int(11) NOT NULL,
              \`payment_method\` varchar(50) NOT NULL COMMENT 'card, cash, bank_transfer, insurance, etc.',
              \`transaction_id\` varchar(255) DEFAULT NULL,
              \`amount\` decimal(10,2) NOT NULL,
              \`payment_date\` timestamp NOT NULL DEFAULT current_timestamp(),
              \`gateway_response\` json DEFAULT NULL,
              \`status\` enum('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
              \`notes\` text DEFAULT NULL,
              \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
              \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (\`id\`),
              KEY \`idx_bill_id\` (\`bill_id\`),
              KEY \`idx_transaction_id\` (\`transaction_id\`),
              KEY \`idx_status\` (\`status\`),
              FOREIGN KEY (\`bill_id\`) REFERENCES \`bills\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await connection.execute(createPaymentsTable);
        console.log('✅ Payments table created successfully');

        // Insert sample payments data
        console.log('🔄 Inserting sample payments data...');

        // First, get some existing bills
        const [bills] = await connection.execute('SELECT id, total_amount FROM bills LIMIT 5');
        
        if (bills.length > 0) {
            const samplePayments = [
                {
                    bill_id: bills[0].id,
                    payment_method: 'card',
                    transaction_id: 'txn_1234567890',
                    amount: bills[0].total_amount * 0.5, // Partial payment
                    status: 'completed',
                    notes: 'Partial payment via credit card'
                },
                {
                    bill_id: bills[0].id,
                    payment_method: 'cash',
                    transaction_id: null,
                    amount: bills[0].total_amount * 0.5, // Complete the payment
                    status: 'completed',
                    notes: 'Remaining balance paid in cash'
                }
            ];

            if (bills.length > 1) {
                samplePayments.push({
                    bill_id: bills[1].id,
                    payment_method: 'bank_transfer',
                    transaction_id: 'bt_9876543210',
                    amount: bills[1].total_amount,
                    status: 'completed',
                    notes: 'Full payment via bank transfer'
                });
            }

            if (bills.length > 2) {
                samplePayments.push({
                    bill_id: bills[2].id,
                    payment_method: 'insurance',
                    transaction_id: 'ins_claim_456789',
                    amount: bills[2].total_amount * 0.8,
                    status: 'completed',
                    notes: 'Insurance payment - 80% coverage'
                });
            }

            if (bills.length > 3) {
                samplePayments.push({
                    bill_id: bills[3].id,
                    payment_method: 'card',
                    transaction_id: 'txn_failed_123',
                    amount: bills[3].total_amount,
                    status: 'failed',
                    notes: 'Payment failed - insufficient funds'
                });
            }

            for (const payment of samplePayments) {
                await connection.execute(`
                    INSERT INTO payments (bill_id, payment_method, transaction_id, amount, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    payment.bill_id,
                    payment.payment_method,
                    payment.transaction_id,
                    payment.amount,
                    payment.status,
                    payment.notes
                ]);
            }

            console.log(`✅ Inserted ${samplePayments.length} sample payments`);
        } else {
            console.log('⚠️  No bills found to create sample payments');
        }

        // Show summary
        const [paymentCount] = await connection.execute('SELECT COUNT(*) as count FROM payments');
        console.log(`📊 Total payments in database: ${paymentCount[0].count}`);

        console.log('🎉 Payments table setup completed successfully!');

    } catch (error) {
        console.error('❌ Error setting up payments table:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run the setup
setupPaymentsTable().catch(console.error);