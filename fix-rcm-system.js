#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 RCM System Fix Tool');
console.log('=' .repeat(50));

// Check and fix common issues
function checkAndFixIssues() {
  let issuesFixed = 0;
  
  console.log('\n1️⃣  Checking RCM Route Registration...');
  
  // Check if RCM routes are properly registered in services/index.js
  const servicesIndexPath = 'server/services/index.js';
  if (fs.existsSync(servicesIndexPath)) {
    const content = fs.readFileSync(servicesIndexPath, 'utf8');
    
    if (content.includes('rcmRoutes') && content.includes('/rcm')) {
      console.log('✅ RCM routes are properly registered');
    } else {
      console.log('❌ RCM routes not found in services/index.js');
      console.log('💡 Fix: Ensure this line exists in server/services/index.js:');
      console.log('   router.use("/rcm", verifyToken, rcmRoutes);');
    }
  } else {
    console.log('❌ services/index.js not found');
  }
  
  console.log('\n2️⃣  Checking Frontend Route Configuration...');
  
  // Check if RCM route is in App.tsx
  const appTsxPath = 'src/App.tsx';
  if (fs.existsSync(appTsxPath)) {
    const content = fs.readFileSync(appTsxPath, 'utf8');
    
    if (content.includes('path="rcm"') && content.includes('RCMManagement')) {
      console.log('✅ RCM route is configured in App.tsx');
    } else {
      console.log('❌ RCM route not found in App.tsx');
      console.log('💡 Fix: Add this route inside the provider routes section:');
      console.log('   <Route path="rcm" element={<RCMManagement />} />');
    }
  } else {
    console.log('❌ App.tsx not found');
  }
  
  console.log('\n3️⃣  Checking API Configuration...');
  
  // Check if RCM APIs are configured
  const apisPath = 'src/services/apis.js';
  if (fs.existsSync(apisPath)) {
    const content = fs.readFileSync(apisPath, 'utf8');
    
    if (content.includes('export const rcm') && content.includes('RCM_DASHBOARD_API')) {
      console.log('✅ RCM APIs are configured');
    } else {
      console.log('❌ RCM APIs not configured in apis.js');
      console.log('💡 Fix: Add RCM API configuration to src/services/apis.js');
    }
  } else {
    console.log('❌ apis.js not found');
  }
  
  console.log('\n4️⃣  Checking Component Files...');
  
  const componentFiles = [
    'src/pages/RCMManagement.tsx',
    'src/components/rcm/RCMDashboard.tsx',
    'src/components/rcm/ClaimsManagement.tsx',
    'src/components/rcm/ARAgingManagement.tsx'
  ];
  
  let missingComponents = [];
  
  for (const file of componentFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - Missing`);
      missingComponents.push(file);
    }
  }
  
  if (missingComponents.length > 0) {
    console.log(`\n⚠️  Missing ${missingComponents.length} component files`);
    console.log('💡 These files need to be created for RCM to work properly');
  }
  
  console.log('\n5️⃣  Checking Backend Files...');
  
  const backendFiles = [
    'server/services/rcm/rcmCtrl.js',
    'server/services/rcm/rcmRoutes.js'
  ];
  
  let missingBackendFiles = [];
  
  for (const file of backendFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - Missing`);
      missingBackendFiles.push(file);
    }
  }
  
  if (missingBackendFiles.length > 0) {
    console.log(`\n⚠️  Missing ${missingBackendFiles.length} backend files`);
    console.log('💡 These files need to be created for RCM backend to work');
  }
  
  return {
    missingComponents,
    missingBackendFiles,
    totalIssues: missingComponents.length + missingBackendFiles.length
  };
}

// Create missing directories
function createDirectories() {
  console.log('\n📁 Creating Required Directories...');
  
  const directories = [
    'src/components/rcm',
    'server/services/rcm'
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } else {
      console.log(`✅ Directory exists: ${dir}`);
    }
  }
}

// Generate startup script
function generateStartupScript() {
  console.log('\n📝 Generating Startup Script...');
  
  const startupScript = `#!/bin/bash

echo "🚀 Starting RCM System..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start backend server
echo "🔧 Starting backend server..."
cd server && npm install && npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend server
echo "🎨 Starting frontend server..."
cd .. && npm run dev &
FRONTEND_PID=$!

echo "✅ RCM System started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8080"
echo "RCM Page: http://localhost:8080/provider/rcm"

# Wait for user input to stop
echo "Press any key to stop the servers..."
read -n 1

# Kill the servers
kill $BACKEND_PID $FRONTEND_PID
echo "🛑 Servers stopped"
`;

  fs.writeFileSync('start-rcm.sh', startupScript);
  console.log('✅ Created startup script: start-rcm.sh');
  
  // Also create Windows batch file
  const windowsScript = `@echo off
echo 🚀 Starting RCM System...

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start backend server
echo 🔧 Starting backend server...
cd server
start /B npm run dev
cd ..

REM Wait for backend to start
timeout /t 5

REM Start frontend server
echo 🎨 Starting frontend server...
start /B npm run dev

echo ✅ RCM System started!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:8080
echo RCM Page: http://localhost:8080/provider/rcm

pause
`;

  fs.writeFileSync('start-rcm.bat', windowsScript);
  console.log('✅ Created Windows startup script: start-rcm.bat');
}

// Generate troubleshooting guide
function generateTroubleshootingGuide() {
  console.log('\n📚 Generating Troubleshooting Guide...');
  
  const guide = `# RCM System Troubleshooting Guide

## Common Issues and Solutions

### 1. "Cannot GET /provider/rcm" Error

**Cause**: Frontend routing issue
**Solution**:
1. Check if RCMManagement component is imported in App.tsx
2. Verify the route is configured: \`<Route path="rcm" element={<RCMManagement />} />\`
3. Ensure you're logged in as a provider (role = 6)

### 2. "Network Error" or API Calls Failing

**Cause**: Backend server not running or API configuration issue
**Solution**:
1. Start backend server: \`npm run server\` (in server directory)
2. Check if server is running on http://localhost:8000
3. Verify API endpoints in src/services/apis.js

### 3. "Component Not Found" Errors

**Cause**: Missing RCM components
**Solution**:
1. Ensure all RCM components exist in src/components/rcm/
2. Check import paths in RCMManagement.tsx
3. Verify component exports

### 4. Database Connection Errors

**Cause**: Database not configured or tables missing
**Solution**:
1. Setup MySQL database
2. Run: \`mysql -u root -p your_db < server/sql/rcm_schema.sql\`
3. Update database credentials in .env file

### 5. Authentication Errors

**Cause**: JWT token issues or user role problems
**Solution**:
1. Ensure user is logged in
2. Check if user role is 6 (provider)
3. Verify JWT token is valid

### 6. Port Already in Use

**Cause**: Ports 8000 or 8080 are occupied
**Solution**:
1. Kill existing processes: \`lsof -ti:8000 | xargs kill -9\`
2. Or change ports in configuration files

## Quick Diagnostic Commands

\`\`\`bash
# Test backend connectivity
curl http://localhost:8000/api/v1/ping

# Test RCM API (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/v1/rcm/dashboard

# Check if frontend is running
curl http://localhost:8080
\`\`\`

## Step-by-Step Startup

1. **Start Backend**:
   \`\`\`bash
   cd server
   npm install
   npm run dev
   \`\`\`

2. **Start Frontend**:
   \`\`\`bash
   npm install
   npm run dev
   \`\`\`

3. **Access RCM**:
   - Login at: http://localhost:8080/login
   - Navigate to: http://localhost:8080/provider/rcm

## Debug Tools

- Run: \`node debug-rcm-system.js\` for comprehensive system check
- Run: \`node fix-rcm-system.js\` for automated fixes
- Open: \`rcm-test.html\` in browser for quick tests

## Contact Support

If issues persist:
1. Check browser console for JavaScript errors
2. Check server logs for backend errors
3. Verify all files are present and properly configured
4. Ensure database is running and accessible
`;

  fs.writeFileSync('RCM_TROUBLESHOOTING.md', guide);
  console.log('✅ Created troubleshooting guide: RCM_TROUBLESHOOTING.md');
}

// Main fix function
function fixRCMSystem() {
  console.log('Starting RCM system diagnosis and fixes...\n');
  
  // Create required directories
  createDirectories();
  
  // Check and identify issues
  const issues = checkAndFixIssues();
  
  // Generate helpful scripts and guides
  generateStartupScript();
  generateTroubleshootingGuide();
  
  console.log('\n📋 Fix Summary:');
  console.log('=' .repeat(30));
  
  if (issues.totalIssues === 0) {
    console.log('✅ No major issues found!');
    console.log('🎯 If RCM still not working, try these steps:');
    console.log('   1. Run: ./start-rcm.sh (or start-rcm.bat on Windows)');
    console.log('   2. Navigate to: http://localhost:8080/provider/rcm');
    console.log('   3. Check browser console for errors');
  } else {
    console.log(`⚠️  Found ${issues.totalIssues} issues that need attention`);
    
    if (issues.missingComponents.length > 0) {
      console.log('\n❌ Missing Frontend Components:');
      issues.missingComponents.forEach(file => console.log(`   - ${file}`));
    }
    
    if (issues.missingBackendFiles.length > 0) {
      console.log('\n❌ Missing Backend Files:');
      issues.missingBackendFiles.forEach(file => console.log(`   - ${file}`));
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Create the missing files listed above');
    console.log('   2. Run this fix script again');
    console.log('   3. Use the startup scripts to launch the system');
  }
  
  console.log('\n📚 Resources Created:');
  console.log('   - start-rcm.sh / start-rcm.bat (startup scripts)');
  console.log('   - RCM_TROUBLESHOOTING.md (troubleshooting guide)');
  console.log('   - debug-rcm-system.js (diagnostic tool)');
  
  console.log('\n🎯 Quick Test:');
  console.log('   1. Start servers: ./start-rcm.sh');
  console.log('   2. Open: http://localhost:8080/provider/rcm');
  console.log('   3. Login with provider credentials');
}

// Run the fix tool
if (require.main === module) {
  fixRCMSystem();
}

module.exports = { fixRCMSystem };