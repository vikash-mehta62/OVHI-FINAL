const mysql = require('mysql2/promise');

async function checkTableStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health'
  });

  try {
    console.log('🔍 Checking table structures...');
    
    // Check billings table structure
    const [billingsStructure] = await connection.execute('DESCRIBE billings');
    console.log('\nBillings table structure:');
    billingsStructure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default} ${col.Extra}`);
    });
    
    // Check foreign key constraints
    const [constraints] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'varn-health' 
      AND TABLE_NAME = 'billings'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('\nForeign key constraints:');
    constraints.forEach(constraint => {
      console.log(`  ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
    });
    
    // Check users table
    const [usersCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`\nUsers table: ${usersCount[0].count} records`);
    
    // Check user_profiles table
    const [profilesCount] = await connection.execute('SELECT COUNT(*) as count FROM user_profiles');
    console.log(`User_profiles table: ${profilesCount[0].count} records`);
    
    // Check if user_profiles.fk_userid references users.user_id
    const [sampleUsers] = await connection.execute('SELECT user_id FROM users LIMIT 5');
    console.log('\nSample user IDs from users table:');
    sampleUsers.forEach(user => console.log(`  ${user.user_id}`));
    
    const [sampleProfiles] = await connection.execute('SELECT fk_userid FROM user_profiles LIMIT 5');
    console.log('\nSample fk_userid from user_profiles table:');
    sampleProfiles.forEach(profile => console.log(`  ${profile.fk_userid}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTableStructure();