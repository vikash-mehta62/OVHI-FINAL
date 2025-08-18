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

async function setupMessagingSystem() {
  let connection;
  
  try {
    console.log('🚀 Setting up OVHI Messaging System...\n');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Read and execute messaging schema
    const schemaPath = path.join(__dirname, 'server/sql/messaging_schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    
    console.log('📋 Creating messaging tables...');
    await connection.execute(schemaSql);
    console.log('✅ Messaging schema created successfully');
    
    // Verify tables were created
    const tables = [
      'team_conversations',
      'team_messages', 
      'message_attachments',
      'message_reactions',
      'conversation_participants'
    ];
    
    console.log('\n🔍 Verifying table creation...');
    for (const table of tables) {
      const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        console.log(`✅ Table '${table}' created successfully`);
      } else {
        console.log(`❌ Table '${table}' not found`);
      }
    }
    
    // Check if message routes need to be added to main server
    console.log('\n📝 Setup Instructions:');
    console.log('1. Add message routes to your main server file:');
    console.log('   const messageRoutes = require("./routes/messageRoutes");');
    console.log('   app.use("/api/v1/messages", messageRoutes);');
    console.log('');
    console.log('2. Import the messageService in your frontend:');
    console.log('   import messageService from "@/services/messageService";');
    console.log('');
    console.log('3. Test the messaging system:');
    console.log('   - Navigate to http://localhost:8080/provider/messages');
    console.log('   - Try sending messages between users');
    console.log('   - Check real-time functionality with Socket.IO');
    
    // Test database connectivity
    console.log('\n🧪 Testing database operations...');
    
    // Test conversation creation
    try {
      await connection.execute(`
        INSERT IGNORE INTO team_conversations (user1_id, user2_id, created_at) 
        VALUES (1, 2, NOW())
      `);
      console.log('✅ Conversation creation test passed');
    } catch (error) {
      console.log('❌ Conversation creation test failed:', error.message);
    }
    
    // Test message insertion
    try {
      await connection.execute(`
        INSERT IGNORE INTO team_messages (conversation_id, sender_id, receiver_id, message, created_at)
        VALUES (1, 1, 2, 'Test message from setup script', NOW())
      `);
      console.log('✅ Message insertion test passed');
    } catch (error) {
      console.log('❌ Message insertion test failed:', error.message);
    }
    
    // Get conversation count
    const [conversationCount] = await connection.execute('SELECT COUNT(*) as count FROM team_conversations');
    const [messageCount] = await connection.execute('SELECT COUNT(*) as count FROM team_messages');
    
    console.log(`\n📊 Current Data:`)
    console.log(`   - Conversations: ${conversationCount[0].count}`);
    console.log(`   - Messages: ${messageCount[0].count}`);
    
    console.log('\n🎉 Messaging system setup completed successfully!');
    console.log('\n🔧 Next Steps:');
    console.log('1. Restart your server to load the new routes');
    console.log('2. Test the messaging functionality in the UI');
    console.log('3. Monitor the console for Socket.IO connection logs');
    console.log('4. Check database for message persistence');
    
  } catch (error) {
    console.error('❌ Error setting up messaging system:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the setup
if (require.main === module) {
  setupMessagingSystem();
}

module.exports = { setupMessagingSystem };