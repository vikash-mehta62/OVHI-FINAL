#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🎨 Starting Frontend Only (for testing)');
console.log('=======================================');

function startFrontend() {
  console.log('Starting frontend development server...');
  
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  frontend.on('close', (code) => {
    console.log(`Frontend server exited with code ${code}`);
  });

  frontend.on('error', (error) => {
    console.error('❌ Frontend error:', error.message);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down frontend...');
    frontend.kill('SIGTERM');
    setTimeout(() => {
      console.log('✅ Frontend stopped');
      process.exit(0);
    }, 1000);
  });

  console.log('\n📋 Frontend Testing Info:');
  console.log('=========================');
  console.log('URL: http://localhost:8080');
  console.log('RCM: http://localhost:8080/provider/rcm');
  console.log('');
  console.log('⚠️  Note: Backend features will not work without backend server');
  console.log('   To start backend: cd server && npm run dev');
  console.log('');
  console.log('🔍 Check browser console for any import errors');
  console.log('Press Ctrl+C to stop');

  return frontend;
}

if (require.main === module) {
  startFrontend();
}

module.exports = { startFrontend };