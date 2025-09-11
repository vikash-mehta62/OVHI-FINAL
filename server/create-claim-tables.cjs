const mysql = require('mysql2/promise');

async function createClaimTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health'
  });

  try {
    console.log('🔄 Creating claim tables...');
    
    // Create claim_comments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS claim_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        claim_id INT NOT NULL,
        user_id INT NOT NULL,
        comment TEXT NOT NULL,
        comment_type ENUM('general', 'correction', 'appeal', 'transfer', 'void') DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_claim_comments_claim_id (claim_id),
        INDEX idx_claim_comments_user_id (user_id),
        INDEX idx_claim_comments_type (comment_type),
        INDEX idx_claim_comments_created (created_at)
      )
    `);
    console.log('✅ Created claim_comments table');
    
    // Create claim_appeals table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS claim_appeals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        claim_id INT NOT NULL,
        appeal_reason TEXT NOT NULL,
        appeal_date DATE NOT NULL,
        status ENUM('pending', 'approved', 'denied', 'withdrawn') DEFAULT 'pending',
        appeal_amount DECIMAL(10,2) DEFAULT 0.00,
        decision_date DATE NULL,
        decision_reason TEXT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_claim_appeals_claim_id (claim_id),
        INDEX idx_claim_appeals_status (status),
        INDEX idx_claim_appeals_date (appeal_date),
        INDEX idx_claim_appeals_created_by (created_by)
      )
    `);
    console.log('✅ Created claim_appeals table');
    
    // Create claim_audit_log table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS claim_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        claim_id INT NOT NULL,
        action_type ENUM('created', 'updated', 'submitted', 'corrected', 'appealed', 'transferred', 'voided', 'commented') NOT NULL,
        old_values JSON NULL,
        new_values JSON NULL,
        user_id INT NOT NULL,
        user_name VARCHAR(255) NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_claim_audit_claim_id (claim_id),
        INDEX idx_claim_audit_action_type (action_type),
        INDEX idx_claim_audit_user_id (user_id),
        INDEX idx_claim_audit_timestamp (timestamp)
      )
    `);
    console.log('✅ Created claim_audit_log table');
    
    // Verify tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'varn-health' 
      AND TABLE_NAME IN ('claim_comments', 'claim_appeals', 'claim_audit_log')
    `);
    
    console.log('📋 Verified tables:', tables.map(t => t.TABLE_NAME));
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await connection.end();
  }
}

createClaimTables();