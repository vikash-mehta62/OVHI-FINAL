const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'varn-health'
};

async function setupServicesSystem() {
  let connection;
  
  try {
    console.log('🚀 Setting up Services Management System...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Create services table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        service_code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        unit_price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_service_code (service_code),
        INDEX idx_category (category),
        INDEX idx_is_active (is_active),
        INDEX idx_service_name (service_name)
      )
    `);

    // Insert sample services
    const sampleServices = [
      ['Office Visit - New Patient', '99201', 'New patient office visit, problem focused', 150.00, 'Office Visits'],
      ['Office Visit - Established Patient', '99213', 'Established patient office visit, expanded problem focused', 120.00, 'Office Visits'],
      ['Annual Physical Exam', '99396', 'Preventive medicine visit, established patient, 40-64 years', 200.00, 'Preventive Care'],
      ['Blood Pressure Check', '99211', 'Office visit for blood pressure monitoring', 50.00, 'Monitoring'],
      ['EKG', '93000', 'Electrocardiogram, routine ECG with at least 12 leads', 75.00, 'Diagnostic Tests'],
      ['Chest X-Ray', '71020', 'Radiologic examination, chest, 2 views', 100.00, 'Radiology'],
      ['Flu Vaccination', '90658', 'Influenza virus vaccine, trivalent', 25.00, 'Immunizations'],
      ['COVID-19 Vaccination', '91300', 'COVID-19 vaccine administration', 30.00, 'Immunizations'],
      ['Basic Metabolic Panel', '80048', 'Basic metabolic panel (glucose, BUN, creatinine, etc.)', 45.00, 'Laboratory'],
      ['Complete Blood Count', '85025', 'Blood count; complete (CBC), automated', 35.00, 'Laboratory'],
      ['Lipid Panel', '80061', 'Lipid panel (cholesterol, triglycerides, HDL, LDL)', 55.00, 'Laboratory'],
      ['Urinalysis', '81001', 'Urinalysis, by dip stick or tablet reagent', 20.00, 'Laboratory'],
      ['Wound Care - Simple', '12001', 'Simple repair of superficial wounds', 80.00, 'Procedures'],
      ['Wound Care - Complex', '13100', 'Repair, complex, trunk', 150.00, 'Procedures'],
      ['Joint Injection', '20610', 'Arthrocentesis, aspiration and/or injection, major joint', 120.00, 'Procedures'],
      ['Telehealth Consultation', '99421', 'Online digital evaluation and management service', 75.00, 'Telehealth'],
      ['Remote Patient Monitoring', '99453', 'Remote patient monitoring setup', 60.00, 'Remote Monitoring'],
      ['Chronic Care Management', '99490', 'Chronic care management services, first 20 minutes', 65.00, 'Care Management'],
      ['Medication Management', '99605', 'Medication therapy management service', 40.00, 'Medication Services'],
      ['Health Coaching', '99401', 'Preventive medicine counseling, individual, 15 minutes', 50.00, 'Counseling']
    ];

    for (const service of sampleServices) {
      try {
        await connection.execute(`
          INSERT IGNORE INTO services (service_name, service_code, description, unit_price, category) 
          VALUES (?, ?, ?, ?, ?)
        `, service);
      } catch (error) {
        console.log(`Skipping duplicate service: ${service[1]}`);
      }
    }
    
    console.log('✅ Services table created and populated with sample data');

    // Verify the setup
    const [services] = await connection.execute('SELECT COUNT(*) as count FROM services');
    console.log(`✅ Services system setup complete! ${services[0].count} services available`);

    // Check table structure first
    const [columns] = await connection.execute('DESCRIBE services');
    console.log('✅ Services table structure:');
    columns.forEach(col => {
      console.log(`  • ${col.Field} (${col.Type})`);
    });

    // Show sample services - adjust query based on actual columns
    let sampleQuery = 'SELECT * FROM services LIMIT 10';
    const hasServiceName = columns.some(col => col.Field === 'service_name');
    
    if (hasServiceName) {
      sampleQuery = `
        SELECT service_name, service_code, category, unit_price 
        FROM services 
        WHERE is_active = true 
        ORDER BY category, service_name 
        LIMIT 10
      `;
    }
    
    const [sampleServicesResult] = await connection.execute(sampleQuery);
    
    console.log('\n📋 Sample Services:');
    sampleServicesResult.forEach(service => {
      console.log(`  • ${service.service_name} (${service.service_code}) - $${service.unit_price} [${service.category}]`);
    });

    console.log('\n🎉 Services Management System is ready!');
    console.log('📍 Access it at: /provider/services');
    
  } catch (error) {
    console.error('❌ Error setting up services system:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
if (require.main === module) {
  setupServicesSystem()
    .then(() => {
      console.log('\n✅ Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupServicesSystem };