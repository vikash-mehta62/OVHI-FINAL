const http = require('http');

console.log('🧪 Testing Image Proxy Endpoint...\n');

// Test the proxy endpoint directly
const testUrl = 'https://varn-dev.s3.amazonaws.com/logos/4bac02e6-ad7d-48dc-9889-28024730aaad.jpeg';
const encodedUrl = encodeURIComponent(testUrl);
const proxyPath = `/api/v1/image/proxy-image?url=${encodedUrl}`;

console.log('🎯 Test Details:');
console.log('   Original URL:', testUrl);
console.log('   Encoded URL:', encodedUrl);
console.log('   Proxy Path:', proxyPath);

// Test if server is running
const options = {
  hostname: 'localhost',
  port: 3000, // Adjust if your server runs on different port
  path: proxyPath,
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

console.log('\n📡 Making request to proxy...');

const req = http.request(options, (res) => {
  console.log('📊 Response Status:', res.statusCode);
  console.log('📊 Response Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('✅ Proxy Test SUCCESSFUL!');
        console.log('   Format:', result.data.format);
        console.log('   Size:', Math.round(result.data.size / 1024) + 'KB');
        console.log('   Base64 Length:', result.data.base64.length);
        console.log('   Content Type:', result.data.contentType);
        
        console.log('\n🎉 Proxy is working correctly!');
        console.log('   The CORS issue should be resolved.');
        console.log('   Make sure your frontend server is running on the same port.');
        
      } else {
        console.log('❌ Proxy Test FAILED:');
        console.log('   Error:', result.error);
        console.log('   Fallback:', result.fallback);
      }
      
    } catch (error) {
      console.log('❌ JSON Parse Error:', error.message);
      console.log('   Raw Response:', data.substring(0, 200) + '...');
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Request Error:', error.message);
  console.log('\n💡 Possible Issues:');
  console.log('   • Server not running on port 3000');
  console.log('   • Image proxy route not registered');
  console.log('   • Network connectivity issue');
  console.log('\n🔧 Solutions:');
  console.log('   1. Start your server: npm run dev (in server directory)');
  console.log('   2. Check server port in package.json');
  console.log('   3. Verify route registration in server/index.js');
});

req.setTimeout(10000, () => {
  console.log('❌ Request Timeout');
  req.destroy();
});

req.end();

console.log('\n⏳ Waiting for response...');