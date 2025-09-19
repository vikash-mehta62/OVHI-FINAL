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

class BillingIntegration {
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

    async checkExistingSchema() {
        try {
            console.log('🔍 Checking existing billing schema...');
            
            // Check if enhanced tables exist
            const tables = ['bills', 'bill_items', 'invoices', 'invoice_items', 'payments', 'invoice_sequences'];
            const existingTables = [];
            const missingTables = [];

            for (const table of tables) {
                const [result] = await this.connection.execute(`SHOW TABLES LIKE '${table}'`);
                if (result.length > 0) {
                    existingTables.push(table);
                } else {
                    missingTables.push(table);
                }
            }

            console.log(`✅ Existing tables: ${existingTables.join(', ')}`);
            if (missingTables.length > 0) {
                console.log(`⚠️ Missing tables: ${missingTables.join(', ')}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Schema check failed:', error.message);
            return false;
        }
    }

    async setupEnhancedSchema() {
        try {
            console.log('📋 Setting up enhanced billing schema...');
            
            const schemaPath = path.join(__dirname, 'server/sql/enhanced_billing_schema.sql');
            const schema = await fs.readFile(schemaPath, 'utf8');
            
            await this.connection.execute(schema);
            console.log('✅ Enhanced billing schema applied successfully');
        } catch (error) {
            console.error('❌ Schema setup failed:', error.message);
            throw error;
        }
    }

    async checkBillingService() {
        try {
            console.log('🔧 Checking billing service compatibility...');
            
            const servicePath = path.join(__dirname, 'server/services/billing/billingService.js');
            const serviceContent = await fs.readFile(servicePath, 'utf8');
            
            // Check for enhanced methods
            const enhancedMethods = [
                'validateBillData',
                'validatePaymentData',
                'generateInvoiceNumber',
                'getPaymentHistory',
                'getAgingReport',
                'cancelInvoice',
                'voidPayment'
            ];

            const availableMethods = [];
            const missingMethods = [];

            for (const method of enhancedMethods) {
                if (serviceContent.includes(method)) {
                    availableMethods.push(method);
                } else {
                    missingMethods.push(method);
                }
            }

            console.log(`✅ Available enhanced methods: ${availableMethods.join(', ')}`);
            if (missingMethods.length > 0) {
                console.log(`⚠️ Missing enhanced methods: ${missingMethods.join(', ')}`);
            }

            return missingMethods.length === 0;
        } catch (error) {
            console.error('❌ Service check failed:', error.message);
            return false;
        }
    }

    async testBasicFunctionality() {
        try {
            console.log('🧪 Testing basic functionality...');
            
            // Test data counts
            const [billCount] = await this.connection.execute('SELECT COUNT(*) as count FROM bills');
            const [invoiceCount] = await this.connection.execute('SELECT COUNT(*) as count FROM invoices');
            const [serviceCount] = await this.connection.execute('SELECT COUNT(*) as count FROM services');
            
            console.log(`📊 Current data:
   Bills: ${billCount[0].count}
   Invoices: ${invoiceCount[0].count}
   Services: ${serviceCount[0].count}`);

            // Test views if they exist
            try {
                const [agingData] = await this.connection.execute('SELECT COUNT(*) as count FROM aging_report');
                console.log(`   Aging Report Records: ${agingData[0].count}`);
            } catch (error) {
                console.log('   Aging Report: Not available');
            }

            try {
                const [summaryData] = await this.connection.execute('SELECT COUNT(*) as count FROM invoice_summary');
                console.log(`   Invoice Summary Records: ${summaryData[0].count}`);
            } catch (error) {
                console.log('   Invoice Summary: Not available');
            }

            return true;
        } catch (error) {
            console.error('❌ Basic functionality test failed:', error.message);
            return false;
        }
    }

    async createSampleData() {
        try {
            console.log('📝 Creating minimal sample data...');
            
            // Check if we have services
            const [services] = await this.connection.execute('SELECT COUNT(*) as count FROM services');
            if (services[0].count === 0) {
                console.log('Creating sample services...');
                await this.connection.execute(`
                    INSERT INTO services (name, description, cpt_codes, price) VALUES
                    ('Consultation', 'Medical consultation', '99213', 150.00),
                    ('Lab Test', 'Laboratory test', '80053', 75.00)
                `);
            }

            // Check if we have patients
            const [patients] = await this.connection.execute(`
                SELECT COUNT(*) as count FROM user_profiles up
                JOIN users_mappings um ON up.fk_userid = um.user_id
                WHERE um.fk_role_id = 7
            `);
            
            if (patients[0].count === 0) {
                console.log('Creating sample patient...');
                const userId = 100;
                
                await this.connection.execute(`
                    INSERT IGNORE INTO user_profiles (
                        fk_userid, firstname, lastname, work_email, phone, dob
                    ) VALUES (?, 'Test', 'Patient', 'test@example.com', '555-0100', '1990-01-01')
                `, [userId]);

                await this.connection.execute(`
                    INSERT IGNORE INTO users_mappings (user_id, fk_role_id, fk_physician_id)
                    VALUES (?, 7, 1)
                `, [userId]);
            }

            console.log('✅ Sample data ready');
        } catch (error) {
            console.error('❌ Sample data creation failed:', error.message);
            throw error;
        }
    }

    async run() {
        console.log('🚀 Enhanced Billing System Integration');
        console.log('='.repeat(50));

        try {
            await this.connect();
            
            const schemaExists = await this.checkExistingSchema();
            if (!schemaExists) {
                await this.setupEnhancedSchema();
            }

            const serviceCompatible = await this.checkBillingService();
            await this.testBasicFunctionality();
            await this.createSampleData();

            console.log('\n🎉 Integration completed successfully!');
            console.log('\nSystem Status:');
            console.log(`   Database Schema: ${schemaExists ? 'Already exists' : 'Newly created'}`);
            console.log(`   Service Methods: ${serviceCompatible ? 'Fully enhanced' : 'Basic functionality'}`);
            
            console.log('\nNext steps:');
            console.log('1. Start your server: npm run dev (in server directory)');
            console.log('2. Test the API: node test-enhanced-billing-system.cjs');
            console.log('3. Access endpoints at: http://localhost:3000/api/billing/');
            console.log('\nAvailable endpoints:');
            console.log('   POST /api/billing/bills - Create bill');
            console.log('   GET  /api/billing/bills - Get all bills');
            console.log('   POST /api/billing/bills/:id/invoice - Generate invoice');
            console.log('   GET  /api/billing/invoices - Get all invoices');
            console.log('   POST /api/billing/invoices/:id/payments - Record payment');
            console.log('   GET  /api/billing/invoices/:id/payments - Get payment history');
            console.log('   GET  /api/billing/reports/aging - Aging report');
            console.log('='.repeat(50));

        } catch (error) {
            console.error('\n💥 Integration failed:', error.message);
            process.exit(1);
        } finally {
            await this.disconnect();
        }
    }
}

// Run integration if called directly
if (require.main === module) {
    const integration = new BillingIntegration();
    integration.run();
}

module.exports = BillingIntegration;