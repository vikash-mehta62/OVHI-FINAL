const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ovhi_db',
    multipleStatements: true
};

class EnhancedBillingSetup {
    constructor() {
        this.connection = null;
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(dbConfig);
            console.log('✅ Connected to database');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            console.log('✅ Database connection closed');
        }
    }

    async executeSchema() {
        try {
            console.log('📋 Executing enhanced billing schema...');
            
            const schemaPath = path.join(__dirname, 'server/sql/enhanced_billing_schema.sql');
            const schema = await fs.readFile(schemaPath, 'utf8');
            
            await this.connection.execute(schema);
            console.log('✅ Enhanced billing schema executed successfully');
        } catch (error) {
            console.error('❌ Schema execution failed:', error.message);
            throw error;
        }
    }

    async createSampleServices() {
        try {
            console.log('🏥 Creating sample services...');
            
            const services = [
                {
                    name: 'Initial Consultation',
                    description: 'Comprehensive initial patient consultation',
                    cpt_codes: '99201',
                    price: 250.00
                },
                {
                    name: 'Follow-up Visit',
                    description: 'Standard follow-up appointment',
                    cpt_codes: '99213',
                    price: 150.00
                },
                {
                    name: 'Diagnostic Test',
                    description: 'Laboratory diagnostic testing',
                    cpt_codes: '80053',
                    price: 75.00
                },
                {
                    name: 'Physical Therapy Session',
                    description: 'One-hour physical therapy session',
                    cpt_codes: '97110',
                    price: 120.00
                },
                {
                    name: 'X-Ray Examination',
                    description: 'Digital X-ray imaging',
                    cpt_codes: '73060',
                    price: 200.00
                },
                {
                    name: 'Blood Work Panel',
                    description: 'Comprehensive metabolic panel',
                    cpt_codes: '80053',
                    price: 85.00
                },
                {
                    name: 'Vaccination',
                    description: 'Standard vaccination administration',
                    cpt_codes: '90471',
                    price: 45.00
                },
                {
                    name: 'Telehealth Consultation',
                    description: 'Virtual consultation via video call',
                    cpt_codes: '99421',
                    price: 100.00
                }
            ];

            for (const service of services) {
                await this.connection.execute(`
                    INSERT IGNORE INTO services (name, description, cpt_codes, price)
                    VALUES (?, ?, ?, ?)
                `, [service.name, service.description, service.cpt_codes, service.price]);
            }

            console.log(`✅ Created ${services.length} sample services`);
        } catch (error) {
            console.error('❌ Sample services creation failed:', error.message);
            throw error;
        }
    }

    async createSamplePatients() {
        try {
            console.log('👥 Creating sample patients...');
            
            // Check if patients already exist
            const [existingPatients] = await this.connection.execute(
                'SELECT COUNT(*) as count FROM user_profiles WHERE fk_userid IN (SELECT user_id FROM users_mappings WHERE fk_role_id = 7)'
            );

            if (existingPatients[0].count > 0) {
                console.log('✅ Sample patients already exist');
                return;
            }

            const patients = [
                {
                    firstname: 'John',
                    lastname: 'Doe',
                    work_email: 'john.doe@email.com',
                    phone: '555-0101',
                    dob: '1985-03-15',
                    address_line: '123 Main St',
                    city: 'Anytown',
                    state: 'CA',
                    zip: '12345',
                    insurance_provider: 'Blue Cross',
                    insurance_id: 'BC123456789'
                },
                {
                    firstname: 'Jane',
                    lastname: 'Smith',
                    work_email: 'jane.smith@email.com',
                    phone: '555-0102',
                    dob: '1990-07-22',
                    address_line: '456 Oak Ave',
                    city: 'Somewhere',
                    state: 'NY',
                    zip: '67890',
                    insurance_provider: 'Aetna',
                    insurance_id: 'AET987654321'
                },
                {
                    firstname: 'Robert',
                    lastname: 'Johnson',
                    work_email: 'robert.johnson@email.com',
                    phone: '555-0103',
                    dob: '1978-11-08',
                    address_line: '789 Pine Rd',
                    city: 'Elsewhere',
                    state: 'TX',
                    zip: '54321',
                    insurance_provider: 'Cigna',
                    insurance_id: 'CIG456789123'
                }
            ];

            for (let i = 0; i < patients.length; i++) {
                const patient = patients[i];
                const userId = 100 + i; // Start from user ID 100

                // Insert user profile
                await this.connection.execute(`
                    INSERT IGNORE INTO user_profiles (
                        fk_userid, firstname, lastname, work_email, phone, dob,
                        address_line, city, state, zip, insurance_provider, insurance_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    userId, patient.firstname, patient.lastname, patient.work_email,
                    patient.phone, patient.dob, patient.address_line, patient.city,
                    patient.state, patient.zip, patient.insurance_provider, patient.insurance_id
                ]);

                // Map user to patient role (role_id = 7)
                await this.connection.execute(`
                    INSERT IGNORE INTO users_mappings (user_id, fk_role_id, fk_physician_id)
                    VALUES (?, 7, 1)
                `, [userId]);
            }

            console.log(`✅ Created ${patients.length} sample patients`);
        } catch (error) {
            console.error('❌ Sample patients creation failed:', error.message);
            throw error;
        }
    }

    async createSampleBillsAndInvoices() {
        try {
            console.log('🧾 Creating sample bills and invoices...');
            
            // Get available patients and services
            const [patients] = await this.connection.execute(`
                SELECT up.fk_userid as patient_id, CONCAT(up.firstname, ' ', up.lastname) as name
                FROM user_profiles up
                JOIN users_mappings um ON up.fk_userid = um.user_id
                WHERE um.fk_role_id = 7
                LIMIT 3
            `);

            const [services] = await this.connection.execute(
                'SELECT service_id, name, price FROM services LIMIT 5'
            );

            if (patients.length === 0 || services.length === 0) {
                console.log('⚠️ No patients or services available for sample data');
                return;
            }

            // Create sample bills
            for (let i = 0; i < patients.length; i++) {
                const patient = patients[i];
                
                // Create a bill with 2-3 services
                const [billResult] = await this.connection.execute(`
                    INSERT INTO bills (patient_id, notes, created_by)
                    VALUES (?, ?, 1)
                `, [patient.patient_id, `Sample bill for ${patient.name}`]);

                const billId = billResult.insertId;
                let totalAmount = 0;

                // Add 2-3 random services to the bill
                const numServices = Math.floor(Math.random() * 2) + 2; // 2-3 services
                const selectedServices = services.slice(0, numServices);

                for (const service of selectedServices) {
                    const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 quantity
                    const lineTotal = service.price * quantity;
                    totalAmount += lineTotal;

                    await this.connection.execute(`
                        INSERT INTO bill_items (bill_id, service_id, quantity, unit_price)
                        VALUES (?, ?, ?, ?)
                    `, [billId, service.service_id, quantity, service.price]);
                }

                // Update bill total
                await this.connection.execute(
                    'UPDATE bills SET total_amount = ? WHERE id = ?',
                    [totalAmount, billId]
                );

                // Generate invoice for some bills
                if (i < 2) { // Generate invoices for first 2 bills
                    // Generate invoice number
                    const year = new Date().getFullYear();
                    const sequence = (i + 1).toString().padStart(4, '0');
                    const invoiceNumber = `INV-${year}-${sequence}`;

                    // Create invoice
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 30);

                    const [invoiceResult] = await this.connection.execute(`
                        INSERT INTO invoices (invoice_number, bill_id, patient_id, total_amount, due_date, notes)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [invoiceNumber, billId, patient.patient_id, totalAmount, dueDate, `Invoice for ${patient.name}`]);

                    const invoiceId = invoiceResult.insertId;

                    // Copy bill items to invoice items
                    const [billItems] = await this.connection.execute(`
                        SELECT bi.*, s.name as service_name, s.cpt_codes as service_code
                        FROM bill_items bi
                        JOIN services s ON bi.service_id = s.service_id
                        WHERE bi.bill_id = ?
                    `, [billId]);

                    for (const item of billItems) {
                        await this.connection.execute(`
                            INSERT INTO invoice_items (invoice_id, service_id, service_name, service_code, quantity, unit_price)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [invoiceId, item.service_id, item.service_name, item.service_code, item.quantity, item.unit_price]);
                    }

                    // Mark bill as finalized
                    await this.connection.execute(
                        'UPDATE bills SET status = "finalized" WHERE id = ?',
                        [billId]
                    );

                    // Add some payments for the first invoice
                    if (i === 0) {
                        const partialPayment = totalAmount * 0.6; // 60% payment
                        await this.connection.execute(`
                            INSERT INTO payments (invoice_id, amount_paid, payment_method, reference_number, notes)
                            VALUES (?, ?, 'card', 'REF001', 'Partial payment via credit card')
                        `, [invoiceId, partialPayment]);
                    }

                    console.log(`✅ Created invoice ${invoiceNumber} for ${patient.name}`);
                }

                console.log(`✅ Created bill for ${patient.name} - Total: $${totalAmount.toFixed(2)}`);
            }

            // Initialize invoice sequence
            const year = new Date().getFullYear();
            await this.connection.execute(`
                INSERT INTO invoice_sequences (year, last_sequence) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE last_sequence = GREATEST(last_sequence, VALUES(last_sequence))
            `, [year, 2]);

        } catch (error) {
            console.error('❌ Sample bills and invoices creation failed:', error.message);
            throw error;
        }
    }

    async verifySetup() {
        try {
            console.log('🔍 Verifying setup...');
            
            // Check tables exist
            const tables = ['bills', 'bill_items', 'invoices', 'invoice_items', 'payments', 'invoice_sequences'];
            for (const table of tables) {
                const [result] = await this.connection.execute(`SHOW TABLES LIKE '${table}'`);
                if (result.length === 0) {
                    throw new Error(`Table ${table} not found`);
                }
            }

            // Check data counts
            const [billCount] = await this.connection.execute('SELECT COUNT(*) as count FROM bills');
            const [invoiceCount] = await this.connection.execute('SELECT COUNT(*) as count FROM invoices');
            const [paymentCount] = await this.connection.execute('SELECT COUNT(*) as count FROM payments');
            const [serviceCount] = await this.connection.execute('SELECT COUNT(*) as count FROM services');

            console.log('📊 Setup Summary:');
            console.log(`   Bills: ${billCount[0].count}`);
            console.log(`   Invoices: ${invoiceCount[0].count}`);
            console.log(`   Payments: ${paymentCount[0].count}`);
            console.log(`   Services: ${serviceCount[0].count}`);

            // Test views
            const [agingData] = await this.connection.execute('SELECT COUNT(*) as count FROM aging_report');
            const [summaryData] = await this.connection.execute('SELECT COUNT(*) as count FROM invoice_summary');
            
            console.log(`   Aging Report Records: ${agingData[0].count}`);
            console.log(`   Invoice Summary Records: ${summaryData[0].count}`);

            console.log('✅ Setup verification completed successfully');
        } catch (error) {
            console.error('❌ Setup verification failed:', error.message);
            throw error;
        }
    }

    async run() {
        console.log('🚀 Enhanced Billing System Setup');
        console.log('='.repeat(50));

        try {
            await this.connect();
            await this.executeSchema();
            await this.createSampleServices();
            await this.createSamplePatients();
            await this.createSampleBillsAndInvoices();
            await this.verifySetup();

            console.log('\n🎉 Enhanced Billing System setup completed successfully!');
            console.log('\nNext steps:');
            console.log('1. Start your server: npm run dev (in server directory)');
            console.log('2. Test the API: node test-enhanced-billing-system.cjs');
            console.log('3. Import Postman collection: node test-enhanced-billing-system.cjs --postman');
            console.log('='.repeat(50));

        } catch (error) {
            console.error('\n💥 Setup failed:', error.message);
            process.exit(1);
        } finally {
            await this.disconnect();
        }
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new EnhancedBillingSetup();
    setup.run();
}

module.exports = EnhancedBillingSetup;