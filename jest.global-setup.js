/**
 * Jest Global Setup
 * Runs once before all tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up test environment...');
  
  // Create reports directory
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Create test database if needed
  if (process.env.NODE_ENV === 'test') {
    try {
      // This would set up test database
      console.log('📊 Setting up test database...');
      // execSync('npm run db:test:setup', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️  Could not set up test database:', error.message);
    }
  }
  
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL = 'sqlite::memory:';
  
  console.log('✅ Test environment setup complete');
};