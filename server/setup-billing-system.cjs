const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration - using the same config as the server
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Update with your MySQL password
  database: 'varn-health', // Using the same database as the server
  multipleStatements: true
};

async function setupBillingSystem() {
  let connection;
  
  try {
    console.log('🚀 Setting up Patient Billing & Invoice Module...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'sql', 'billing_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    await connection.execute(schema);
    console.log('✅ Database schema created successfully');
    
    // Verify tables were created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('services', 'patients', 'bills', 'invoices', 'bill_items', 'invoice_items', 'payments')
    `, [dbConfig.database]);
    
    console.log('✅ Created tables:', tables.map(t => t.TABLE_NAME).join(', '));
    
    // Check sample data
    const [serviceCount] = await connection.execute('SELECT COUNT(*) as count FROM services');
    const [patientCount] = await connection.execute('SELECT COUNT(*) as count FROM patients');
    
    console.log(`✅ Sample data loaded: ${serviceCount[0].count} services, ${patientCount[0].count} patients`);
    
    // Create some sample bills and invoices for demo
    await createSampleData(connection);
    
    console.log('🎉 Billing system setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Start the frontend: cd .. && npm run dev');
    console.log('3. Navigate to /billing to test the system');
    
  } catch (error) {
    console.error('❌ Error setting up billing system:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function createSampleData(connection) {
  try {
    // Create sample bills
    const [billResult1] = await connection.execute(`
      INSERT INTO bills (patient_id, notes, total_amount, status) 
      VALUES (1, 'Regular checkup and blood work', 235.00, 'draft')
    `);
    
    const [billResult2] = await connection.execute(`
      INSERT INTO bills (patient_id, notes, total_amount, status) 
      VALUES (2, 'Dermatology consultation', 200.00, 'finalized')
    `);
    
    // Add bill items
    await connection.execute(`
      INSERT INTO bill_items (bill_id, service_id, quantity, unit_price) VALUES
      (?, 1, 1, 150.00),
      (?, 2, 1, 85.00)
    `, [billResult1.insertId, billResult1.insertId]);
    
    await connection.execute(`
      INSERT INTO bill_items (bill_id, service_id, quantity, unit_price) VALUES
      (?, 7, 1, 200.00)
    `, [billResult2.insertId]);
    
    // Create sample invoices
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    const [invoiceResult1] = await connection.execute(`
      INSERT INTO invoices (invoice_number, bill_id, patient_id, total_amount, amount_paid, status, due_date, notes)
      VALUES ('INV-2025-0001', ?, 2, 200.00, 0.00, 'pending', ?, 'Dermatology consultation')
    `, [billResult2.insertId, dueDate]);
    
    const [invoiceResult2] = await connection.execute(`
      INSERT INTO invoices (invoice_number, patient_id, total_amount, amount_paid, status, due_date, notes)
      VALUES ('INV-2025-0002', 3, 320.00, 320.00, 'paid', ?, 'Physical therapy sessions')
    `, [dueDate]);
    
    // Add invoice items
    await connection.execute(`
      INSERT INTO invoice_items (invoice_id, service_id, service_name, service_code, quantity, unit_price) VALUES
      (?, 7, 'Dermatology Consultation', '99203', 1, 200.00)
    `, [invoiceResult1.insertId]);
    
    await connection.execute(`
      INSERT INTO invoice_items (invoice_id, service_id, service_name, service_code, quantity, unit_price) VALUES
      (?, 4, 'Physical Therapy Session', '97110', 3, 95.00),
      (?, 6, 'ECG/EKG', '93000', 1, 75.00)
    `, [invoiceResult2.insertId, invoiceResult2.insertId]);
    
    // Add sample payment
    await connection.execute(`
      INSERT INTO payments (invoice_id, amount_paid, payment_method, transaction_id, notes)
      VALUES (?, 320.00, 'card', 'txn_1234567890', 'Full payment via credit card')
    `, [invoiceResult2.insertId]);
    
    console.log('✅ Sample bills and invoices created');
    
  } catch (error) {
    console.error('Error creating sample data:', error);
    throw error;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupBillingSystem().catch(console.error);
}

module.exports = { setupBillingSystem };