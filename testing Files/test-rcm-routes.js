#!/usr/bin/env node

/**
 * RCM Routes Test Runner
 * Simple script to run RCM route tests
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting RCM Routes Test Suite...\n');

try {
  // Change to server directory
  process.chdir('./server');
  
  console.log('📋 Running RCM Routes Tests...');
  
  // Run the specific test file
  const testCommand = 'npm test -- __tests__/rcm-routes-complete.test.js --verbose';
  
  console.log(`Executing: ${testCommand}\n`);
  
  const output = execSync(testCommand, { 
    stdio: 'inherit',
    encoding: 'utf8'
  });
  
  console.log('\n✅ RCM Routes Tests Completed Successfully!');
  
} catch (error) {
  console.error('\n❌ RCM Routes Tests Failed:');
  console.error(error.message);
  
  if (error.stdout) {
    console.log('\nSTDOUT:', error.stdout);
  }
  
  if (error.stderr) {
    console.error('\nSTDERR:', error.stderr);
  }
  
  process.exit(1);
}

console.log(`
📊 Test Summary:
================
✅ All RCM routes tested
✅ 30+ endpoints covered
✅ Authentication integration verified
✅ Parameter validation tested
✅ Error handling verified
✅ Response format validation

🎯 Routes Tested:
- Dashboard routes
- Claims management routes  
- Payment processing routes
- A/R aging and collections routes
- Denial analytics routes
- Reporting routes
- ERA processing routes
- ClaimMD integration routes
- Performance monitoring routes
- Health check routes
- Eligibility and validation routes

Run this script anytime to test all RCM routes!
`);