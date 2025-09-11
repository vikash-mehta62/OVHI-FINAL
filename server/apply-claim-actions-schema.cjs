const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function applyClaimActionsSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health',
    multipleStatements: true
  });

  try {
    console.log('🔄 Applying claim actions schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'sql', 'claim_actions_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await connection.execute(schema);
    
    console.log('✅ Claim actions schema applied successfully');
    
    // Verify tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'varn-health' 
      AND TABLE_NAME IN ('claim_comments', 'claim_appeals', 'claim_audit_log')
    `);
    
    console.log('📋 Created tables:', tables.map(t => t.TABLE_NAME));
    
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
  } finally {
    await connection.end();
  }
}

applyClaimActionsSchema();