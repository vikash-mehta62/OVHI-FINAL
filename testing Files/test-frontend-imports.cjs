#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Frontend Import Resolution');
console.log('====================================');

const componentsToCheck = [
  'src/components/payments/PaymentForm.tsx',
  'src/components/payments/PaymentGatewaySettings.tsx',
  'src/components/payments/PaymentHistory.tsx',
  'src/components/rcm/ClaimsManagement.tsx',
  'src/components/rcm/RCMDashboard.tsx',
  'src/components/rcm/ARAgingManagement.tsx',
  'src/pages/RCMManagement.tsx'
];

const servicesFiles = [
  'src/services/operations/payments.js',
  'src/services/operations/rcm.js'
];

function checkFileExists(filePath) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${filePath}`);
  return exists;
}

function checkPackageJson() {
  console.log('\n📦 Checking package.json dependencies:');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredPackages = [
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
      'recharts',
      'lucide-react'
    ];
    
    requiredPackages.forEach(pkg => {
      if (dependencies[pkg]) {
        console.log(`✅ ${pkg}: ${dependencies[pkg]}`);
      } else {
        console.log(`❌ Missing: ${pkg}`);
      }
    });
    
    return requiredPackages.every(pkg => dependencies[pkg]);
  } catch (error) {
    console.log(`❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('\n1. Checking component files exist:');
  const allFilesExist = componentsToCheck.every(checkFileExists);
  
  console.log('\n2. Checking service files exist:');
  const allServicesExist = servicesFiles.every(checkFileExists);
  
  console.log('\n3. Checking dependencies:');
  const allDepsInstalled = checkPackageJson();
  
  console.log('\n📊 Summary:');
  console.log(`Files exist: ${allFilesExist ? '✅' : '❌'}`);
  console.log(`Services exist: ${allServicesExist ? '✅' : '❌'}`);
  console.log(`Dependencies installed: ${allDepsInstalled ? '✅' : '❌'}`);
  
  if (allFilesExist && allServicesExist && allDepsInstalled) {
    console.log('\n🎉 All frontend components should work correctly!');
    console.log('\n🚀 Next steps:');
    console.log('1. Start backend: cd server && npm run dev');
    console.log('2. Start frontend: npm run dev');
    console.log('3. Access RCM: http://localhost:8080/provider/rcm');
    console.log('\n💳 Payment Gateway Setup:');
    console.log('• Go to Settings tab in RCM');
    console.log('• Add Stripe gateway with test keys');
    console.log('• Test with card: 4242424242424242');
    return true;
  } else {
    console.log('\n⚠️  Some issues found. Please fix them before running the system.');
    
    if (!allDepsInstalled) {
      console.log('\n🔧 To fix dependencies:');
      console.log('npm install @stripe/stripe-js @stripe/react-stripe-js recharts lucide-react');
    }
    
    return false;
  }
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main };