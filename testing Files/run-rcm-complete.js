#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Complete RCM System with Payment Processing');
console.log('=====================================================');

// Check if setup has been run
const setupMarkerFile = path.join(__dirname, '.rcm-setup-complete');
const hasRunSetup = fs.existsSync(setupMarkerFile);

async function runSetup() {
  if (hasRunSetup) {
    console.log('✅ Setup already completed, skipping...');
    return true;
  }

  console.log('📦 Running initial setup...');
  
  return new Promise((resolve, reject) => {
    const setup = spawn('node', ['setup-rcm-with-payments.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    setup.on('close', (code) => {
      if (code === 0) {
        // Create marker file
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

async function startBackend() {
  console.log('🔧 Starting backend server...');
  
  return new Promise((resolve, reject) => {
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'server'),
      stdio: 'pipe',
      shell: true
    });

    let backendReady = false;

    backend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Backend] ${output.trim()}`);
      
      // Check if server is ready
      if (output.includes('Server running') || output.includes('listening')) {
        if (!backendReady) {
          backendReady = true;
          console.log('✅ Backend server is ready');
          resolve(backend);
        }
      }
    });

    backend.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`[Backend Error] ${output.trim()}`);
    });

    backend.on('close', (code) => {
      console.log(`Backend server exited with code ${code}`);
    });

    backend.on('error', (error) => {
      console.error('❌ Backend error:', error.message);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!backendReady) {
        console.log('⏰ Backend taking longer than expected, continuing...');
        resolve(backend);
      }
    }, 30000);
  });
}

async function startFrontend() {
  console.log('🎨 Starting frontend server...');
  
  return new Promise((resolve, reject) => {
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: 'pipe',
      shell: true
    });

    let frontendReady = false;

    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Frontend] ${output.trim()}`);
      
      // Check if server is ready
      if (output.includes('Local:') || output.includes('localhost')) {
        if (!frontendReady) {
          frontendReady = true;
          console.log('✅ Frontend server is ready');
          resolve(frontend);
        }
      }
    });

    frontend.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`[Frontend Error] ${output.trim()}`);
    });

    frontend.on('close', (code) => {
      console.log(`Frontend server exited with code ${code}`);
    });

    frontend.on('error', (error) => {
      console.error('❌ Frontend error:', error.message);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!frontendReady) {
        console.log('⏰ Frontend taking longer than expected, continuing...');
        resolve(frontend);
      }
    }, 30000);
  });
}

async function runTests() {
  console.log('🧪 Running system tests...');
  
  return new Promise((resolve) => {
    const test = spawn('node', ['test-rcm-complete.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    test.on('close', (code) => {
      if (code === 0) {
        console.log('✅ All tests passed');
      } else {
        console.log('⚠️  Some tests failed, but system should still work');
      }
      resolve(code === 0);
    });

    test.on('error', (error) => {
      console.error('❌ Test error:', error.message);
      resolve(false);
    });
  });
}

async function showSystemInfo() {
  console.log('\n🎯 RCM System Information');
  console.log('==========================');
  console.log('Frontend URL: http://localhost:8080');
  console.log('Backend URL:  http://localhost:8000');
  console.log('RCM Dashboard: http://localhost:8080/provider/rcm');
  console.log('');
  console.log('📋 Available Features:');
  console.log('• Revenue Cycle Management Dashboard');
  console.log('• Claims Management with Status Tracking');
  console.log('• Payment Processing with Stripe Integration');
  console.log('• A/R Aging Analysis and Management');
  console.log('• Payment History and Analytics');
  console.log('• Payment Gateway Configuration');
  console.log('');
  console.log('💳 Test Payment Cards (Stripe):');
  console.log('• Visa: 4242424242424242');
  console.log('• MasterCard: 5555555555554444');
  console.log('• Declined: 4000000000000002');
  console.log('');
  console.log('🔧 Quick Actions:');
  console.log('• Configure payment gateway: Settings tab');
  console.log('• View sample data: Dashboard tab');
  console.log('• Process test payment: Claims tab');
  console.log('• Run diagnostics: node debug-rcm-system.cjs');
  console.log('• Run tests: node test-rcm-complete.js');
  console.log('');
  console.log('📚 Documentation: RCM_SYSTEM_GUIDE.md');
}

async function main() {
  let backendProcess = null;
  let frontendProcess = null;

  try {
    // Step 1: Run setup if needed
    await runSetup();

    // Step 2: Start backend
    backendProcess = await startBackend();
    
    // Wait a bit for backend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Start frontend
    frontendProcess = await startFrontend();
    
    // Wait a bit for frontend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Run tests
    await runTests();

    // Step 5: Show system information
    showSystemInfo();

    console.log('\n🎉 RCM System is now running!');
    console.log('Press Ctrl+C to stop both servers');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down servers...');
      
      if (backendProcess) {
        backendProcess.kill('SIGTERM');
      }
      
      if (frontendProcess) {
        frontendProcess.kill('SIGTERM');
      }
      
      setTimeout(() => {
        console.log('✅ Servers stopped');
        process.exit(0);
      }, 2000);
    });

    // Keep the process alive
    process.stdin.resume();

  } catch (error) {
    console.error('❌ Failed to start RCM system:', error.message);
    
    // Cleanup
    if (backendProcess) {
      backendProcess.kill('SIGTERM');
    }
    
    if (frontendProcess) {
      frontendProcess.kill('SIGTERM');
    }
    
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { main };