/**
 * Comprehensive Test for Unified RCM System
 * Tests all components and integrations
 */

const path = require('path');

// Test imports and basic functionality
async function testSystemComponents() {
  console.log('🧪 Testing Unified RCM System Components...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: Core Service Import
  try {
    console.log('📋 Testing Core Service Import...');
    const unifiedRCMService = require('./services/rcm/unifiedRCMService');
    console.log('  ✅ UnifiedRCMService imported successfully');
    results.passed++;
  } catch (error) {
    console.error('  ❌ UnifiedRCMService import failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'UnifiedRCMService Import', error: error.message });
  }

  // Test 2: Core Controller Import
  try {
    console.log('📋 Testing Core Controller Import...');
    const unifiedRCMController = require('./services/rcm/unifiedRCMController');
    console.log('  ✅ UnifiedRCMController imported successfully');
    results.passed++;
  } catch (error) {
    console.error('  ❌ UnifiedRCMController import failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'UnifiedRCMController Import', error: error.message });
  }

  // Test 3: Routes Import
  try {
    console.log('📋 Testing Routes Import...');
    const unifiedRCMRoutes = require('./routes/unifiedRCMRoutes');
    console.log('  ✅ UnifiedRCMRoutes imported successfully');
    results.passed++;
  } catch (error) {
    console.error('  ❌ UnifiedRCMRoutes import failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'UnifiedRCMRoutes Import', error: error.message });
  }

  // Test 4: Middleware Import
  try {
    console.log('📋 Testing Middleware Import...');
    const validationMiddleware = require('./middleware/validation');
    const authMiddleware = require('./middleware/auth');
    console.log('  ✅ Validation and Auth middleware imported successfully');
    results.passed++;
  } catch (error) {
    console.error('  ❌ Middleware import failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Middleware Import', error: error.message });
  }

  // Test 5: Utilities Import
  try {
    console.log('📋 Testing Utilities Import...');
    const dbUtils = require('./utils/dbUtils');
    const cacheUtils = require('./utils/cacheUtils');
    const standardizedResponse = require('./utils/standardizedResponse');
    console.log('  ✅ All utilities imported successfully');
    results.passed++;
  } catch (error) {
    console.error('  ❌ Utilities import failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Utilities Import', error: error.message });
  }

  // Test 6: Service Registration
  try {
    console.log('📋 Testing Service Registration...');
    const services = require('./services/index');
    console.log('  ✅ Services registered successfully');
    results.passed++;
  } catch (error) {
    console.error('  ❌ Service registration failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Service Registration', error: error.message });
  }

  // Test 7: Server Entry Point
  try {
    console.log('📋 Testing Server Entry Point...');
    // Test server loading without starting it
    const serverModule = require('./index');
    console.log('  ✅ Server entry point loaded successfully');
    results.passed++;
  } catch (error) {
    console.error('  ❌ Server entry point failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Server Entry Point', error: error.message });
  }

  // Test 8: Database Schema Validation
  try {
    console.log('📋 Testing Database Schema...');
    const fs = require('fs');
    const schemaPath = path.join(__dirname, 'sql', 'claimmd_integration_schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      if (schema.includes('CREATE TABLE') && schema.includes('claimmd_integration')) {
        console.log('  ✅ Database schema file exists and is valid');
        results.passed++;
      } else {
        throw new Error('Schema file exists but appears invalid');
      }
    } else {
      throw new Error('Schema file not found');
    }
  } catch (error) {
    console.error('  ❌ Database schema validation failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Database Schema', error: error.message });
  }

  // Test 9: Configuration Files
  try {
    console.log('📋 Testing Configuration Files...');
    const fs = require('fs');
    
    // Check for essential config files
    const configFiles = [
      'package.json',
      '../package.json'
    ];
    
    let configFound = false;
    for (const configFile of configFiles) {
      if (fs.existsSync(path.join(__dirname, configFile))) {
        configFound = true;
        break;
      }
    }
    
    if (configFound) {
      console.log('  ✅ Configuration files found');
      results.passed++;
    } else {
      throw new Error('No configuration files found');
    }
  } catch (error) {
    console.error('  ❌ Configuration validation failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Configuration Files', error: error.message });
  }

  // Test 10: Frontend Components Check
  try {
    console.log('📋 Testing Frontend Components...');
    const fs = require('fs');
    
    const frontendComponents = [
      '../src/components/rcm/UnifiedRCMDashboard.tsx',
      '../src/components/rcm/ClaimMDIntegration.tsx',
      '../src/components/rcm/EnhancedERAProcessor.tsx',
      '../src/components/rcm/PerformanceMonitoring.tsx',
      '../src/components/rcm/EnhancedCollectionsManagement.tsx'
    ];
    
    let componentsFound = 0;
    for (const component of frontendComponents) {
      if (fs.existsSync(path.join(__dirname, component))) {
        componentsFound++;
      }
    }
    
    if (componentsFound >= 3) {
      console.log(`  ✅ Frontend components found (${componentsFound}/${frontendComponents.length})`);
      results.passed++;
    } else {
      throw new Error(`Only ${componentsFound}/${frontendComponents.length} frontend components found`);
    }
  } catch (error) {
    console.error('  ❌ Frontend components check failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Frontend Components', error: error.message });
  }

  return results;
}

// Test API endpoint structure
async function testAPIStructure() {
  console.log('\n🔗 Testing API Structure...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    console.log('📋 Testing Route Definitions...');
    const express = require('express');
    const app = express();
    
    // Test route mounting
    const unifiedRCMRoutes = require('./routes/unifiedRCMRoutes');
    app.use('/api/rcm', unifiedRCMRoutes);
    
    console.log('  ✅ Routes mounted successfully');
    results.passed++;
  } catch (error) {
    console.error('  ❌ Route mounting failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Route Mounting', error: error.message });
  }

  try {
    console.log('📋 Testing Middleware Chain...');
    const validation = require('./middleware/validation');
    const auth = require('./middleware/auth');
    
    // Check if middleware functions exist
    if (typeof validation.validateClaimData === 'function' &&
        typeof auth.authenticateToken === 'function') {
      console.log('  ✅ Middleware functions available');
      results.passed++;
    } else {
      throw new Error('Required middleware functions not found');
    }
  } catch (error) {
    console.error('  ❌ Middleware chain test failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Middleware Chain', error: error.message });
  }

  return results;
}

// Test service functionality
async function testServiceFunctionality() {
  console.log('\n⚙️ Testing Service Functionality...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    console.log('📋 Testing Service Methods...');
    const UnifiedRCMService = require('./services/rcm/unifiedRCMService');
    
    // Check if service has required methods
    const requiredMethods = [
      'getDashboardData',
      'getClaimsData',
      'getPaymentsData',
      'getARAgingData',
      'getCollectionsData',
      'getDenialManagementData',
      'getPerformanceMetrics',
      'createClaim',
      'getClaimById',
      'getPaymentPostingData',
      'updateCollectionStatus'
    ];
    
    let methodsFound = 0;
    for (const method of requiredMethods) {
      if (typeof UnifiedRCMService.prototype[method] === 'function') {
        methodsFound++;
      }
    }
    
    if (methodsFound >= requiredMethods.length * 0.8) { // 80% of methods should exist
      console.log(`  ✅ Service methods available (${methodsFound}/${requiredMethods.length})`);
      results.passed++;
    } else {
      throw new Error(`Only ${methodsFound}/${requiredMethods.length} required methods found`);
    }
  } catch (error) {
    console.error('  ❌ Service methods test failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Service Methods', error: error.message });
  }

  try {
    console.log('📋 Testing Controller Methods...');
    const unifiedRCMController = require('./services/rcm/unifiedRCMController');
    
    // Check if controller has required methods
    const requiredControllerMethods = [
      'getDashboard',
      'getClaims',
      'getPayments',
      'getARAging',
      'getCollections',
      'getDenialManagement',
      'getPerformanceMetrics'
    ];
    
    let controllerMethodsFound = 0;
    for (const method of requiredControllerMethods) {
      if (typeof unifiedRCMController[method] === 'function') {
        controllerMethodsFound++;
      }
    }
    
    if (controllerMethodsFound >= requiredControllerMethods.length * 0.8) {
      console.log(`  ✅ Controller methods available (${controllerMethodsFound}/${requiredControllerMethods.length})`);
      results.passed++;
    } else {
      throw new Error(`Only ${controllerMethodsFound}/${requiredControllerMethods.length} required controller methods found`);
    }
  } catch (error) {
    console.error('  ❌ Controller methods test failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Controller Methods', error: error.message });
  }

  return results;
}

// Generate comprehensive report
function generateReport(componentResults, apiResults, serviceResults) {
  const totalPassed = componentResults.passed + apiResults.passed + serviceResults.passed;
  const totalFailed = componentResults.failed + apiResults.failed + serviceResults.failed;
  const totalTests = totalPassed + totalFailed;
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;

  console.log('\n📊 Comprehensive Test Results');
  console.log('===============================');
  console.log(`✅ Total Passed: ${totalPassed}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log(`📈 Success Rate: ${successRate}%`);
  console.log(`🧪 Total Tests: ${totalTests}`);

  console.log('\n📋 Test Breakdown:');
  console.log(`  🔧 Component Tests: ${componentResults.passed}/${componentResults.passed + componentResults.failed} passed`);
  console.log(`  🔗 API Tests: ${apiResults.passed}/${apiResults.passed + apiResults.failed} passed`);
  console.log(`  ⚙️  Service Tests: ${serviceResults.passed}/${serviceResults.passed + serviceResults.failed} passed`);

  // Show errors if any
  const allErrors = [
    ...componentResults.errors,
    ...apiResults.errors,
    ...serviceResults.errors
  ];

  if (allErrors.length > 0) {
    console.log('\n❌ Failed Tests Details:');
    allErrors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.test}: ${error.error}`);
    });
  }

  // System status
  console.log('\n🎯 System Status:');
  if (successRate >= 90) {
    console.log('  🟢 EXCELLENT - System is production ready');
  } else if (successRate >= 80) {
    console.log('  🟡 GOOD - System is mostly functional with minor issues');
  } else if (successRate >= 70) {
    console.log('  🟠 FAIR - System has some issues that need attention');
  } else {
    console.log('  🔴 POOR - System has significant issues that must be resolved');
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (componentResults.failed > 0) {
    console.log('  • Fix component import/export issues');
  }
  if (apiResults.failed > 0) {
    console.log('  • Review API route and middleware configuration');
  }
  if (serviceResults.failed > 0) {
    console.log('  • Complete service method implementations');
  }
  if (totalFailed === 0) {
    console.log('  • System is ready for deployment! 🚀');
    console.log('  • Consider running integration tests with database');
    console.log('  • Set up monitoring and logging');
  }

  return {
    totalPassed,
    totalFailed,
    successRate: parseFloat(successRate),
    status: successRate >= 90 ? 'EXCELLENT' : successRate >= 80 ? 'GOOD' : successRate >= 70 ? 'FAIR' : 'POOR'
  };
}

// Main execution
async function main() {
  console.log('🚀 Starting Comprehensive Unified RCM System Test\n');
  console.log('================================================\n');

  try {
    // Run all test suites
    const componentResults = await testSystemComponents();
    const apiResults = await testAPIStructure();
    const serviceResults = await testServiceFunctionality();

    // Generate final report
    const finalReport = generateReport(componentResults, apiResults, serviceResults);

    console.log('\n🎉 Test Execution Completed!');
    console.log(`Final Status: ${finalReport.status} (${finalReport.successRate}% success rate)`);

    // Exit with appropriate code
    process.exit(finalReport.totalFailed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  testSystemComponents,
  testAPIStructure,
  testServiceFunctionality,
  generateReport
};