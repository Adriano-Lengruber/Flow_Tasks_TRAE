#!/usr/bin/env node

/**
 * Quality Check Script
 * Runs comprehensive quality checks including linting, testing, security, and performance
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Load quality configuration
const qualityConfig = require('../quality-metrics.config.js');

class QualityChecker {
  constructor() {
    this.results = {
      linting: { passed: false, errors: [], warnings: [] },
      testing: { passed: false, coverage: {}, results: {} },
      security: { passed: false, vulnerabilities: [] },
      performance: { passed: false, metrics: {} },
      accessibility: { passed: false, violations: [] },
      overall: { passed: false, score: 0 }
    };
    
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    
    console.log(`${colors[type](`[${timestamp}]`)} ${message}`);
  }

  async runCommand(command, options = {}) {
    try {
      this.log(`Running: ${command}`);
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });
      return { success: true, output: result };
    } catch (error) {
      return { 
        success: false, 
        error: error.message, 
        output: error.stdout || error.stderr 
      };
    }
  }

  async checkLinting() {
    this.log('🔍 Running linting checks...', 'info');
    
    // ESLint check
    const eslintResult = await this.runCommand('npm run lint', { silent: true });
    
    if (eslintResult.success) {
      this.results.linting.passed = true;
      this.log('✅ Linting passed', 'success');
    } else {
      this.results.linting.errors.push(eslintResult.error);
      this.log('❌ Linting failed', 'error');
      console.log(eslintResult.output);
    }
    
    // TypeScript check
    const tscResult = await this.runCommand('npx tsc --noEmit', { silent: true });
    
    if (!tscResult.success) {
      this.results.linting.errors.push('TypeScript compilation errors');
      this.log('❌ TypeScript check failed', 'error');
    }
    
    // Prettier check
    const prettierResult = await this.runCommand('npx prettier --check .', { silent: true });
    
    if (!prettierResult.success) {
      this.results.linting.warnings.push('Code formatting issues');
      this.log('⚠️  Code formatting issues found', 'warning');
    }
  }

  async runTests() {
    this.log('🧪 Running tests...', 'info');
    
    // Unit tests
    const unitTestResult = await this.runCommand('npm run test:unit -- --coverage --passWithNoTests', { silent: true });
    
    if (unitTestResult.success) {
      this.log('✅ Unit tests passed', 'success');
      
      // Parse coverage report
      try {
        const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
        if (fs.existsSync(coverageFile)) {
          const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
          this.results.testing.coverage = coverage.total;
          
          // Check coverage thresholds
          const { statements, branches, functions, lines } = coverage.total.pct;
          const thresholds = qualityConfig.codeQuality.coverage;
          
          if (statements >= thresholds.statements &&
              branches >= thresholds.branches &&
              functions >= thresholds.functions &&
              lines >= thresholds.lines) {
            this.log(`✅ Coverage thresholds met (${statements}% statements)`, 'success');
          } else {
            this.log(`❌ Coverage below thresholds (${statements}% statements)`, 'error');
            this.results.testing.passed = false;
          }
        }
      } catch (error) {
        this.log('⚠️  Could not parse coverage report', 'warning');
      }
    } else {
      this.results.testing.passed = false;
      this.log('❌ Unit tests failed', 'error');
    }
    
    // Integration tests
    const integrationTestResult = await this.runCommand('npm run test:integration', { silent: true });
    
    if (!integrationTestResult.success) {
      this.log('❌ Integration tests failed', 'error');
      this.results.testing.passed = false;
    } else {
      this.log('✅ Integration tests passed', 'success');
    }
  }

  async checkSecurity() {
    this.log('🔒 Running security checks...', 'info');
    
    // npm audit
    const auditResult = await this.runCommand('npm audit --audit-level=moderate', { silent: true });
    
    if (auditResult.success) {
      this.log('✅ No security vulnerabilities found', 'success');
      this.results.security.passed = true;
    } else {
      this.log('❌ Security vulnerabilities found', 'error');
      this.results.security.vulnerabilities.push('npm audit failures');
      console.log(auditResult.output);
    }
    
    // Snyk check (if available)
    const snykResult = await this.runCommand('npx snyk test', { silent: true });
    
    if (!snykResult.success && !snykResult.error.includes('command not found')) {
      this.log('❌ Snyk security scan failed', 'error');
      this.results.security.vulnerabilities.push('Snyk scan failures');
    }
  }

  async checkPerformance() {
    this.log('⚡ Running performance checks...', 'info');
    
    // Bundle size analysis
    const bundleAnalysisResult = await this.runCommand('npm run build', { silent: true });
    
    if (bundleAnalysisResult.success) {
      // Check bundle sizes
      const buildDir = path.join(process.cwd(), 'dist');
      
      if (fs.existsSync(buildDir)) {
        const files = fs.readdirSync(buildDir, { recursive: true });
        let totalSize = 0;
        let jsSize = 0;
        let cssSize = 0;
        
        files.forEach(file => {
          if (typeof file === 'string') {
            const filePath = path.join(buildDir, file);
            if (fs.statSync(filePath).isFile()) {
              const size = fs.statSync(filePath).size;
              totalSize += size;
              
              if (file.endsWith('.js')) jsSize += size;
              if (file.endsWith('.css')) cssSize += size;
            }
          }
        });
        
        const thresholds = qualityConfig.performance.web.maxBundleSize;
        
        if (jsSize / 1024 <= thresholds.js && 
            cssSize / 1024 <= thresholds.css && 
            totalSize / 1024 <= thresholds.total) {
          this.log(`✅ Bundle size within limits (${Math.round(totalSize / 1024)}KB total)`, 'success');
          this.results.performance.passed = true;
        } else {
          this.log(`❌ Bundle size exceeds limits (${Math.round(totalSize / 1024)}KB total)`, 'error');
        }
        
        this.results.performance.metrics = {
          totalSize: Math.round(totalSize / 1024),
          jsSize: Math.round(jsSize / 1024),
          cssSize: Math.round(cssSize / 1024)
        };
      }
    } else {
      this.log('❌ Build failed', 'error');
    }
  }

  async checkAccessibility() {
    this.log('♿ Running accessibility checks...', 'info');
    
    // Run axe-core tests if available
    const axeResult = await this.runCommand('npm run test:a11y', { silent: true });
    
    if (axeResult.success) {
      this.log('✅ Accessibility tests passed', 'success');
      this.results.accessibility.passed = true;
    } else if (!axeResult.error.includes('script not found')) {
      this.log('❌ Accessibility tests failed', 'error');
      this.results.accessibility.violations.push('Axe-core violations');
    } else {
      this.log('⚠️  No accessibility tests configured', 'warning');
      this.results.accessibility.passed = true; // Don't fail if not configured
    }
  }

  calculateOverallScore() {
    const weights = {
      linting: 20,
      testing: 30,
      security: 25,
      performance: 15,
      accessibility: 10
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.keys(weights).forEach(category => {
      if (this.results[category]) {
        totalScore += this.results[category].passed ? weights[category] : 0;
        totalWeight += weights[category];
      }
    });
    
    this.results.overall.score = Math.round((totalScore / totalWeight) * 100);
    this.results.overall.passed = this.results.overall.score >= 80;
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    
    this.log('\n📊 Quality Check Report', 'info');
    this.log('=' .repeat(50), 'info');
    
    // Overall score
    const scoreColor = this.results.overall.score >= 80 ? 'success' : 
                      this.results.overall.score >= 60 ? 'warning' : 'error';
    
    this.log(`Overall Score: ${this.results.overall.score}%`, scoreColor);
    this.log(`Duration: ${Math.round(duration / 1000)}s`, 'info');
    this.log('', 'info');
    
    // Category results
    Object.keys(this.results).forEach(category => {
      if (category === 'overall') return;
      
      const result = this.results[category];
      const status = result.passed ? '✅' : '❌';
      const color = result.passed ? 'success' : 'error';
      
      this.log(`${status} ${category.toUpperCase()}`, color);
      
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          this.log(`  - ${error}`, 'error');
        });
      }
      
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          this.log(`  - ${warning}`, 'warning');
        });
      }
      
      if (result.coverage) {
        this.log(`  Coverage: ${result.coverage.pct.statements}% statements`, 'info');
      }
      
      if (result.metrics) {
        Object.keys(result.metrics).forEach(metric => {
          this.log(`  ${metric}: ${result.metrics[metric]}`, 'info');
        });
      }
    });
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'reports', 'quality-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      duration,
      results: this.results
    }, null, 2));
    
    this.log(`\n📄 Report saved to: ${reportPath}`, 'info');
  }

  async run() {
    this.log('🚀 Starting quality checks...', 'info');
    
    try {
      await this.checkLinting();
      await this.runTests();
      await this.checkSecurity();
      await this.checkPerformance();
      await this.checkAccessibility();
      
      this.calculateOverallScore();
      this.generateReport();
      
      if (this.results.overall.passed) {
        this.log('\n🎉 All quality checks passed!', 'success');
        process.exit(0);
      } else {
        this.log('\n💥 Quality checks failed!', 'error');
        process.exit(1);
      }
    } catch (error) {
      this.log(`\n💥 Quality check failed with error: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run quality checks if this script is executed directly
if (require.main === module) {
  const checker = new QualityChecker();
  checker.run();
}

module.exports = QualityChecker;