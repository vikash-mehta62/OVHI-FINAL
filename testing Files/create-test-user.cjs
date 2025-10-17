const mysql = require('./server/node_modules/mysql2/promise');
const bcrypt = require('./server/node_modules/bcryptjs');

async function createTestUser() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'varn-health'
    });

    console.log('🔗 Connected to database');

    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ?',
      ['test@example.com']
    );

    if (existingUsers.length > 0) {
      console.log('✅ Test user already exists');
      return;
    }

    // Create test user
    const [result] = await connection.execute(`
      INSERT INTO users (
        email, 
        password, 
        firstName, 
        lastName, 
        role, 
        isActive,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      'test@example.com',
      hashedPassword,
      'Test',
      'User',
      6,
      1
    ]);

    console.log('✅ Test user created successfully with ID:', result.insertId);

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the function
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('🎉 Test user setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createTestUser };