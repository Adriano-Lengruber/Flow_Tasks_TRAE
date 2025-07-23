#!/usr/bin/env node

/**
 * Automated Deployment Script
 * Handles deployment to different environments with quality gates
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const QualityChecker = require('./quality-check.js');

class DeploymentManager {
  constructor(environment = 'staging') {
    this.environment = environment;
    this.config = this.loadConfig();
    this.startTime = Date.now();
    this.deploymentId = `deploy-${Date.now()}`;
    
    this.log(`🚀 Starting deployment to ${environment}`, 'info');
  }

  loadConfig() {
    const configPath = path.join(process.cwd(), 'deploy.config.js');
    
    if (fs.existsSync(configPath)) {
      return require(configPath);
    }
    
    // Default configuration
    return {
      environments: {
        staging: {
          url: process.env.STAGING_URL || 'https://staging.example.com',
          branch: 'development',
          requireQualityGates: true,
          requireApproval: false,
          healthCheckEndpoint: '/health',
          rollbackOnFailure: true
        },
        production: {
          url: process.env.PRODUCTION_URL || 'https://example.com',
          branch: 'master',
          requireQualityGates: true,
          requireApproval: true,
          healthCheckEndpoint: '/health',
          rollbackOnFailure: true,
          backupDatabase: true
        }
      },
      docker: {
        registry: process.env.DOCKER_REGISTRY || 'docker.io',
        namespace: process.env.DOCKER_NAMESPACE || 'myapp',
        tag: process.env.DOCKER_TAG || 'latest'
      },
      notifications: {
        slack: process.env.SLACK_WEBHOOK_URL,
        email: process.env.NOTIFICATION_EMAIL
      }
    };
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

  async checkPrerequisites() {
    this.log('🔍 Checking deployment prerequisites...', 'info');
    
    const envConfig = this.config.environments[this.environment];
    
    if (!envConfig) {
      throw new Error(`Environment '${this.environment}' not configured`);
    }
    
    // Check if on correct branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    if (currentBranch !== envConfig.branch) {
      throw new Error(`Must be on '${envConfig.branch}' branch for ${this.environment} deployment. Currently on '${currentBranch}'`);
    }
    
    // Check for uncommitted changes
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    
    if (gitStatus) {
      throw new Error('Uncommitted changes detected. Please commit or stash changes before deployment.');
    }
    
    // Check if branch is up to date
    await this.runCommand('git fetch origin');
    const localCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const remoteCommit = execSync(`git rev-parse origin/${envConfig.branch}`, { encoding: 'utf8' }).trim();
    
    if (localCommit !== remoteCommit) {
      throw new Error(`Local branch is not up to date with origin/${envConfig.branch}`);
    }
    
    this.log('✅ Prerequisites check passed', 'success');
  }

  async runQualityGates() {
    const envConfig = this.config.environments[this.environment];
    
    if (!envConfig.requireQualityGates) {
      this.log('⏭️  Skipping quality gates', 'warning');
      return;
    }
    
    this.log('🔒 Running quality gates...', 'info');
    
    const qualityChecker = new QualityChecker();
    
    try {
      await qualityChecker.run();
      this.log('✅ Quality gates passed', 'success');
    } catch (error) {
      throw new Error(`Quality gates failed: ${error.message}`);
    }
  }

  async requestApproval() {
    const envConfig = this.config.environments[this.environment];
    
    if (!envConfig.requireApproval) {
      return;
    }
    
    this.log('⏸️  Deployment requires approval', 'warning');
    
    // Send notification
    await this.sendNotification(
      `🚀 Deployment to ${this.environment} requires approval`,
      `Deployment ID: ${this.deploymentId}\nBranch: ${envConfig.branch}\nEnvironment: ${this.environment}`
    );
    
    // In a real scenario, this would wait for external approval
    // For now, we'll just prompt the user
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve, reject) => {
      rl.question('Approve deployment? (y/N): ', (answer) => {
        rl.close();
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          this.log('✅ Deployment approved', 'success');
          resolve();
        } else {
          reject(new Error('Deployment not approved'));
        }
      });
    });
  }

  async backupDatabase() {
    const envConfig = this.config.environments[this.environment];
    
    if (!envConfig.backupDatabase) {
      return;
    }
    
    this.log('💾 Creating database backup...', 'info');
    
    const backupName = `backup-${this.environment}-${Date.now()}`;
    
    // This would be replaced with actual backup commands
    const backupResult = await this.runCommand(
      `echo "Creating backup: ${backupName}"`,
      { silent: true }
    );
    
    if (backupResult.success) {
      this.log(`✅ Database backup created: ${backupName}`, 'success');
      return backupName;
    } else {
      throw new Error('Database backup failed');
    }
  }

  async buildApplication() {
    this.log('🔨 Building application...', 'info');
    
    // Install dependencies
    const installResult = await this.runCommand('npm ci');
    
    if (!installResult.success) {
      throw new Error('Failed to install dependencies');
    }
    
    // Build application
    const buildResult = await this.runCommand('npm run build');
    
    if (!buildResult.success) {
      throw new Error('Application build failed');
    }
    
    this.log('✅ Application built successfully', 'success');
  }

  async buildDockerImage() {
    this.log('🐳 Building Docker image...', 'info');
    
    const { registry, namespace, tag } = this.config.docker;
    const imageTag = `${registry}/${namespace}:${tag}-${this.environment}`;
    
    const buildResult = await this.runCommand(
      `docker build -t ${imageTag} .`
    );
    
    if (!buildResult.success) {
      throw new Error('Docker image build failed');
    }
    
    // Push to registry
    const pushResult = await this.runCommand(
      `docker push ${imageTag}`
    );
    
    if (!pushResult.success) {
      throw new Error('Failed to push Docker image');
    }
    
    this.log(`✅ Docker image built and pushed: ${imageTag}`, 'success');
    return imageTag;
  }

  async deployToEnvironment(imageTag) {
    this.log(`🚀 Deploying to ${this.environment}...`, 'info');
    
    const envConfig = this.config.environments[this.environment];
    
    // This would be replaced with actual deployment commands
    // Examples: kubectl, docker-compose, AWS ECS, etc.
    
    if (this.environment === 'staging') {
      // Deploy to staging
      const deployResult = await this.runCommand(
        `echo "Deploying ${imageTag} to staging"`
      );
      
      if (!deployResult.success) {
        throw new Error('Staging deployment failed');
      }
    } else if (this.environment === 'production') {
      // Deploy to production with blue-green deployment
      const deployResult = await this.runCommand(
        `echo "Blue-green deployment of ${imageTag} to production"`
      );
      
      if (!deployResult.success) {
        throw new Error('Production deployment failed');
      }
    }
    
    this.log(`✅ Deployed to ${this.environment}`, 'success');
  }

  async runHealthChecks() {
    this.log('🏥 Running health checks...', 'info');
    
    const envConfig = this.config.environments[this.environment];
    const healthUrl = `${envConfig.url}${envConfig.healthCheckEndpoint}`;
    
    // Wait for application to start
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      try {
        const healthResult = await this.runCommand(
          `curl -f ${healthUrl}`,
          { silent: true }
        );
        
        if (healthResult.success) {
          this.log('✅ Health checks passed', 'success');
          return;
        }
      } catch (error) {
        // Continue trying
      }
      
      attempts++;
      this.log(`Health check attempt ${attempts}/${maxAttempts} failed, retrying...`, 'warning');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    throw new Error('Health checks failed after maximum attempts');
  }

  async runSmokeTests() {
    this.log('💨 Running smoke tests...', 'info');
    
    const smokeTestResult = await this.runCommand(
      'npm run test:smoke',
      { silent: true }
    );
    
    if (smokeTestResult.success) {
      this.log('✅ Smoke tests passed', 'success');
    } else {
      throw new Error('Smoke tests failed');
    }
  }

  async rollback(backupName) {
    this.log('🔄 Rolling back deployment...', 'error');
    
    // This would implement actual rollback logic
    const rollbackResult = await this.runCommand(
      `echo "Rolling back to ${backupName || 'previous version'}"`
    );
    
    if (rollbackResult.success) {
      this.log('✅ Rollback completed', 'success');
    } else {
      this.log('❌ Rollback failed', 'error');
    }
  }

  async sendNotification(title, message) {
    const { slack, email } = this.config.notifications;
    
    if (slack) {
      try {
        await this.runCommand(
          `curl -X POST -H 'Content-type: application/json' --data '{"text":"${title}\\n${message}"}' ${slack}`,
          { silent: true }
        );
        this.log('📱 Slack notification sent', 'info');
      } catch (error) {
        this.log('⚠️  Failed to send Slack notification', 'warning');
      }
    }
    
    if (email) {
      this.log(`📧 Email notification would be sent to ${email}`, 'info');
    }
  }

  async generateDeploymentReport() {
    const duration = Date.now() - this.startTime;
    const report = {
      deploymentId: this.deploymentId,
      environment: this.environment,
      timestamp: new Date().toISOString(),
      duration: Math.round(duration / 1000),
      success: true,
      branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
      commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    const reportPath = path.join(process.cwd(), 'reports', `deployment-${this.deploymentId}.json`);
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📄 Deployment report saved: ${reportPath}`, 'info');
    return report;
  }

  async deploy() {
    let backupName = null;
    
    try {
      await this.checkPrerequisites();
      await this.runQualityGates();
      await this.requestApproval();
      
      backupName = await this.backupDatabase();
      
      await this.buildApplication();
      const imageTag = await this.buildDockerImage();
      
      await this.deployToEnvironment(imageTag);
      await this.runHealthChecks();
      await this.runSmokeTests();
      
      const report = await this.generateDeploymentReport();
      
      await this.sendNotification(
        `🎉 Deployment to ${this.environment} successful`,
        `Deployment ID: ${this.deploymentId}\nDuration: ${report.duration}s\nCommit: ${report.commit.substring(0, 8)}`
      );
      
      this.log(`\n🎉 Deployment to ${this.environment} completed successfully!`, 'success');
      this.log(`Duration: ${report.duration}s`, 'info');
      
    } catch (error) {
      this.log(`\n💥 Deployment failed: ${error.message}`, 'error');
      
      const envConfig = this.config.environments[this.environment];
      
      if (envConfig.rollbackOnFailure) {
        await this.rollback(backupName);
      }
      
      await this.sendNotification(
        `❌ Deployment to ${this.environment} failed`,
        `Deployment ID: ${this.deploymentId}\nError: ${error.message}`
      );
      
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const environment = process.argv[2] || 'staging';
  
  if (!['staging', 'production'].includes(environment)) {
    console.error('Usage: node deploy.js [staging|production]');
    process.exit(1);
  }
  
  const deployer = new DeploymentManager(environment);
  deployer.deploy();
}

module.exports = DeploymentManager;