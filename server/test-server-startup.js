/**
 * Simple test to check if the server can start without syntax errors
 */

console.log('🧪 Testing server startup...');

try {
  // Test importing the main service files
  console.log('📦 Testing imports...');
  
  const unifiedRCMService = require('./services/rcm/unifiedRCMService');
  console.log('✅ UnifiedRCMService imported successfully');
  
  const unifiedRCMController = require('./services/rcm/unifiedRCMController');
  console.log('✅ UnifiedRCMController imported successfully');
  
  const unifiedRCMRoutes = require('./routes/unifiedRCMRoutes');
  console.log('✅ UnifiedRCMRoutes imported successfully');
  
  const validationMiddleware = require('./middleware/validation');
  console.log('✅ ValidationMiddleware imported successfully');
  
  const authMiddleware = require('./middleware/auth');
  console.log('✅ AuthMiddleware imported successfully');
  
  const dbUtils = require('./utils/dbUtils');
  console.log('✅ DbUtils imported successfully');
  
  const cacheUtils = require('./utils/cacheUtils');
  console.log('✅ CacheUtils imported successfully');
  
  const standardizedResponse = require('./utils/standardizedResponse');
  console.log('✅ StandardizedResponse imported successfully');
  
  console.log('\n🎉 All imports successful! Server should start without syntax errors.');
  
  // Test creating service instance
  console.log('\n🔧 Testing service instantiation...');
  const serviceInstance = new unifiedRCMService();
  console.log('✅ UnifiedRCMService instance created successfully');
  
  console.log('\n✨ Server startup test completed successfully!');
  
} catch (error) {
  console.error('\n❌ Server startup test failed:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}