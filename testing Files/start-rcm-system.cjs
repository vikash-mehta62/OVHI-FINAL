#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting RCM System with Payment Processing');
console.log('==============================================');

// Check if setup has been run
const setupMarkerFile = path.join(__dirname, '.rcm-setup-complete');

async function checkSetup() {
  if (fs.existsSync(setupMarkerFile)) {
    console.log('✅ Setup already completed');
    return true;
  }
  
  console.log('⚠️  Setup not completed. Running setup first...');
  
  return new Promise((resolve, reject) => {
    const setup = spawn('node', ['setup-rcm-with-payments.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    setup.on('close', (code) => {
      if (code === 0) {
        fs.writeFileSync(setupMarkerFile, new Date().toISOString());
        console.log('✅ Setup completed successfully');
        resolve(true);
      } else {
        console.error('❌ Setup failed');
        reject(new Error(`Setup failed with code ${code}`));
      }
    });

    setup.on('error', (error) => {
      console.error('❌ Setup error:', error.message);
      reject(error);
    });
  });
}

async function startServers() {
  console.log('\n🔧 Starting backend server...');
  
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'pipe',
    shell: true
  });

  backend.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backend.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });

  // Wait a bit for backend to start
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n🎨 Starting frontend server...');
  
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true
  });

  frontend.stdout.on('data', (data) => {
    console.log(`[Frontend] ${data.toString().trim()}`);
  });

  frontend.stderr.on('data', (data) => {
    console.error(`[Frontend Error] ${data.toString().trim()}`);
  });

  // Wait a bit for frontend to start
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n🎉 RCM System is now running!');
  console.log('================================');
  console.log('Frontend: http://localhost:8080');
  console.log('Backend:  http://localhost:8000');
  console.log('RCM URL:  http://localhost:8080/provider/rcm');
  console.log('');
  console.log('📋 Features Available:');
  console.log('• Revenue Cycle Management Dashboard');
  console.log('• Claims Management with Payment Processing');
  console.log('• Payment History and Analytics');
  console.log('• A/R Aging Analysis');
  console.log('• Payment Gateway Configuration');
  console.log('');
  console.log('💳 Test Payment Setup:');
  console.log('1. Go to Settings tab in RCM');
  console.log('2. Add Stripe gateway');
  console.log('3. Use test keys: pk_test_... and sk_test_...');
  console.log('4. Test with card: 4242424242424242');
  console.log('');
  console.log('Press Ctrl+C to stop servers');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
    setTimeout(() => {
      console.log('✅ Servers stopped');
      process.exit(0);
    }, 2000);
  });

  // Keep process alive
  process.stdin.resume();
  
  return { backend, frontend };
}

async function main() {
  try {
    // Check and run setup if needed
    await checkSetup();
    
    // Start both servers
    await startServers();
    
  } catch (error) {
    console.error('❌ Failed to start RCM system:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure MySQL is running');
    console.log('2. Check .env file in server directory');
    console.log('3. Run: npm install in both root and server directories');
    console.log('4. Check if ports 8000 and 8080 are available');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };