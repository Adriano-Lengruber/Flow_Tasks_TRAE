// Quality Metrics Configuration
// This file defines quality gates, thresholds, and monitoring rules

module.exports = {
  // Code Quality Thresholds
  codeQuality: {
    coverage: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
      // Exclude certain files from coverage requirements
      exclude: [
        '**/*.test.{js,ts,tsx}',
        '**/*.spec.{js,ts,tsx}',
        '**/test-utils/**',
        '**/mocks/**',
        '**/*.config.{js,ts}',
        '**/dist/**',
        '**/build/**'
      ]
    },
    
    complexity: {
      // Cyclomatic complexity threshold
      maxComplexity: 10,
      // Cognitive complexity threshold
      maxCognitiveComplexity: 15,
      // Maximum function length
      maxFunctionLength: 50,
      // Maximum file length
      maxFileLength: 300
    },
    
    maintainability: {
      // Maintainability index threshold (0-100)
      minMaintainabilityIndex: 70,
      // Technical debt ratio threshold
      maxTechnicalDebtRatio: 5,
      // Duplication threshold
      maxDuplicationPercentage: 3
    },
    
    security: {
      // Security vulnerability thresholds
      maxHighVulnerabilities: 0,
      maxMediumVulnerabilities: 2,
      maxLowVulnerabilities: 5,
      // Dependency audit settings
      auditLevel: 'moderate',
      excludeDevDependencies: false
    }
  },
  
  // Performance Thresholds
  performance: {
    web: {
      // Core Web Vitals thresholds
      firstContentfulPaint: 1800, // ms
      largestContentfulPaint: 2500, // ms
      firstInputDelay: 100, // ms
      cumulativeLayoutShift: 0.1,
      
      // Bundle size thresholds
      maxBundleSize: {
        js: 2048, // KB
        css: 512, // KB
        total: 3072 // KB
      },
      
      // Network thresholds
      maxRequests: 50,
      maxLoadTime: 3000, // ms
      maxTimeToInteractive: 3500 // ms
    },
    
    api: {
      // API response time thresholds
      maxResponseTime: {
        p50: 200, // ms
        p95: 500, // ms
        p99: 1000 // ms
      },
      
      // Throughput thresholds
      minThroughput: 100, // requests per second
      
      // Error rate thresholds
      maxErrorRate: 1, // percentage
      maxTimeoutRate: 0.5 // percentage
    },
    
    database: {
      // Database query thresholds
      maxQueryTime: 100, // ms
      maxSlowQueries: 5, // percentage
      maxConnectionPoolUsage: 80 // percentage
    }
  },
  
  // Accessibility Thresholds
  accessibility: {
    // WCAG compliance level
    wcagLevel: 'AA',
    
    // Axe-core rule violations
    maxViolations: {
      critical: 0,
      serious: 2,
      moderate: 5,
      minor: 10
    },
    
    // Color contrast requirements
    colorContrast: {
      normal: 4.5,
      large: 3.0
    },
    
    // Keyboard navigation requirements
    keyboardNavigation: true,
    screenReaderSupport: true
  },
  
  // Testing Thresholds
  testing: {
    unit: {
      minCoverage: 80,
      maxTestDuration: 5000, // ms per test
      maxSuiteSize: 100 // tests per suite
    },
    
    integration: {
      minCoverage: 70,
      maxTestDuration: 30000, // ms per test
      maxSuiteSize: 50
    },
    
    e2e: {
      maxTestDuration: 60000, // ms per test
      maxSuiteSize: 20,
      maxRetries: 2
    },
    
    // Test reliability thresholds
    reliability: {
      maxFlakiness: 5, // percentage
      minPassRate: 95 // percentage
    }
  },
  
  // Code Style and Linting
  linting: {
    eslint: {
      maxErrors: 0,
      maxWarnings: 10,
      rules: {
        // Custom rule configurations
        'complexity': ['error', { max: 10 }],
        'max-lines': ['error', { max: 300 }],
        'max-lines-per-function': ['error', { max: 50 }],
        'max-depth': ['error', { max: 4 }],
        'max-params': ['error', { max: 4 }]
      }
    },
    
    prettier: {
      enforceFormatting: true,
      maxFormattingErrors: 0
    },
    
    typescript: {
      strict: true,
      maxTypeErrors: 0,
      noImplicitAny: true,
      noImplicitReturns: true
    }
  },
  
  // Git and Version Control Quality
  git: {
    commitMessage: {
      // Conventional commits enforcement
      enforceConventional: true,
      maxLength: 72,
      requireScope: false,
      requireDescription: true
    },
    
    pullRequest: {
      requireReview: true,
      minReviewers: 1,
      requireTests: true,
      requireDocumentation: false,
      maxChangedFiles: 20,
      maxLinesChanged: 500
    },
    
    branch: {
      // Branch naming conventions
      namingPattern: '^(feature|bugfix|hotfix|release)\/.+$',
      maxBranchAge: 30, // days
      requireLinearHistory: false
    }
  },
  
  // Documentation Quality
  documentation: {
    // README requirements
    readme: {
      requireInstallation: true,
      requireUsage: true,
      requireContributing: true,
      requireLicense: true
    },
    
    // Code documentation
    code: {
      minCommentRatio: 10, // percentage
      requireFunctionDocs: true,
      requireClassDocs: true,
      requireComplexFunctionDocs: true
    },
    
    // API documentation
    api: {
      requireOpenAPI: true,
      requireExamples: true,
      requireErrorCodes: true
    }
  },
  
  // Monitoring and Alerting
  monitoring: {
    // Health check endpoints
    healthChecks: {
      interval: 60, // seconds
      timeout: 5, // seconds
      retries: 3
    },
    
    // Error tracking
    errorTracking: {
      maxErrorRate: 1, // percentage
      alertThreshold: 10, // errors per minute
      ignorePatterns: [
        'Network request failed',
        'User cancelled'
      ]
    },
    
    // Performance monitoring
    performanceMonitoring: {
      sampleRate: 0.1, // 10% of requests
      alertOnSlowQueries: true,
      alertOnHighMemoryUsage: true,
      alertOnHighCPUUsage: true
    }
  },
  
  // Quality Gates
  qualityGates: {
    // Pre-commit gates
    preCommit: {
      runLinting: true,
      runUnitTests: true,
      runTypeCheck: true,
      runSecurityScan: false
    },
    
    // Pre-push gates
    prePush: {
      runAllTests: true,
      checkCoverage: true,
      runSecurityScan: true,
      checkDependencies: true
    },
    
    // Pre-merge gates
    preMerge: {
      requireAllChecks: true,
      requireReview: true,
      requireUpToDate: true,
      runE2ETests: true
    },
    
    // Pre-deploy gates
    preDeploy: {
      runFullTestSuite: true,
      runPerformanceTests: true,
      runSecurityTests: true,
      checkQualityMetrics: true
    }
  },
  
  // Reporting Configuration
  reporting: {
    // Report formats
    formats: ['json', 'html', 'junit', 'lcov'],
    
    // Report destinations
    destinations: {
      local: './reports',
      s3: process.env.REPORTS_S3_BUCKET,
      slack: process.env.SLACK_WEBHOOK_URL
    },
    
    // Report scheduling
    schedule: {
      daily: true,
      weekly: true,
      onFailure: true,
      onDeploy: true
    },
    
    // Metrics to track
    metrics: [
      'code-coverage',
      'test-results',
      'performance',
      'security-vulnerabilities',
      'code-quality',
      'accessibility',
      'bundle-size',
      'dependency-updates'
    ]
  }
};