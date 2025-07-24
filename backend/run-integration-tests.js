const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Remove any existing test database
const dbPath = path.join(__dirname, 'test.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:';
process.env.JWT_SECRET = 'test-jwt-secret';

try {
  console.log('Running integration tests...');
  execSync('npx jest --testPathPattern=integration --forceExit --detectOpenHandles', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('Integration tests completed successfully!');
} catch (error) {
  console.error('Integration tests failed:', error.message);
  process.exit(1);
}