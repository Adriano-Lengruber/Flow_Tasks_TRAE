/**
 * Jest Global Teardown
 * Runs once after all tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up test database
  if (process.env.NODE_ENV === 'test') {
    try {
      console.log('🗑️  Cleaning up test database...');
      // execSync('npm run db:test:teardown', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️  Could not clean up test database:', error.message);
    }
  }
  
  // Generate test summary report
  const reportsDir = path.join(__dirname, 'reports');
  const summaryPath = path.join(reportsDir, 'test-summary.json');
  
  if (fs.existsSync(reportsDir)) {
    const summary = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      testRun: {
        completed: true,
        duration: process.uptime() * 1000, // Convert to milliseconds
        coverage: {
          // This would be populated by Jest coverage data
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        }
      }
    };
    
    try {
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`📄 Test summary saved to: ${summaryPath}`);
    } catch (error) {
      console.warn('⚠️  Could not save test summary:', error.message);
    }
  }
  
  console.log('✅ Test environment cleanup complete');
};