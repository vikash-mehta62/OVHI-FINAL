const jwt = require('jsonwebtoken');

// Generate a test token for API testing
function generateTestToken() {
  const payload = {
    user_id: 1,
    username: 'test_user',
    roleid: 1,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };
  
  const token = jwt.sign(payload, 'test'); // Using the JWT_SECRET from .env
  return token;
}

// Generate and display token
const testToken = generateTestToken();
console.log('Generated Test Token:');
console.log(testToken);
console.log('\nUse this token in your API tests by setting:');
console.log(`Authorization: Bearer ${testToken}`);

module.exports = { generateTestToken };