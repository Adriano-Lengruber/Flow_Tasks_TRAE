/**
 * Deployment Configuration
 * Defines environment-specific settings and deployment strategies
 */

module.exports = {
  // Environment configurations
  environments: {
    development: {
      name: 'Development',
      url: process.env.DEV_URL || 'http://localhost:3000',
      apiUrl: process.env.DEV_API_URL || 'http://localhost:8000',
      branch: 'development',
      requireQualityGates: false,
      requireApproval: false,
      healthCheckEndpoint: '/api/health',
      rollbackOnFailure: false,
      backupDatabase: false,
      autoScale: false,
      monitoring: {
        enabled: false
      }
    },
    
    staging: {
      name: 'Staging',
      url: process.env.STAGING_URL || 'https://staging-tasks.example.com',
      apiUrl: process.env.STAGING_API_URL || 'https://api-staging-tasks.example.com',
      branch: 'development',
      requireQualityGates: true,
      requireApproval: false,
      healthCheckEndpoint: '/api/health',
      rollbackOnFailure: true,
      backupDatabase: true,
      autoScale: true,
      maxInstances: 3,
      minInstances: 1,
      monitoring: {
        enabled: true,
        alerting: false
      },
      database: {
        host: process.env.STAGING_DB_HOST,
        name: process.env.STAGING_DB_NAME || 'tasks_staging',
        backupRetention: 7 // days
      },
      cdn: {
        enabled: true,
        invalidateOnDeploy: true
      }
    },
    
    production: {
      name: 'Production',
      url: process.env.PRODUCTION_URL || 'https://tasks.example.com',
      apiUrl: process.env.PRODUCTION_API_URL || 'https://api.tasks.example.com',
      branch: 'master',
      requireQualityGates: true,
      requireApproval: true,
      healthCheckEndpoint: '/api/health',
      rollbackOnFailure: true,
      backupDatabase: true,
      autoScale: true,
      maxInstances: 10,
      minInstances: 2,
      deploymentStrategy: 'blue-green',
      monitoring: {
        enabled: true,
        alerting: true,
        uptimeChecks: true
      },
      database: {
        host: process.env.PRODUCTION_DB_HOST,
        name: process.env.PRODUCTION_DB_NAME || 'tasks_production',
        backupRetention: 30, // days
        replication: true
      },
      cdn: {
        enabled: true,
        invalidateOnDeploy: true,
        cacheHeaders: {
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      },
      security: {
        waf: true,
        ddosProtection: true,
        sslOnly: true
      }
    }
  },
  
  // Docker configuration
  docker: {
    registry: process.env.DOCKER_REGISTRY || 'ghcr.io',
    namespace: process.env.DOCKER_NAMESPACE || 'myorg/tasks-app',
    
    frontend: {
      dockerfile: './frontend/Dockerfile',
      context: './frontend',
      buildArgs: {
        NODE_ENV: 'production',
        BUILD_VERSION: process.env.BUILD_VERSION || 'latest'
      }
    },
    
    backend: {
      dockerfile: './backend/Dockerfile',
      context: './backend',
      buildArgs: {
        NODE_ENV: 'production',
        BUILD_VERSION: process.env.BUILD_VERSION || 'latest'
      }
    }
  },
  
  // Kubernetes configuration
  kubernetes: {
    namespace: {
      development: 'tasks-dev',
      staging: 'tasks-staging',
      production: 'tasks-prod'
    },
    
    resources: {
      frontend: {
        requests: {
          cpu: '100m',
          memory: '128Mi'
        },
        limits: {
          cpu: '500m',
          memory: '512Mi'
        }
      },
      
      backend: {
        requests: {
          cpu: '200m',
          memory: '256Mi'
        },
        limits: {
          cpu: '1000m',
          memory: '1Gi'
        }
      }
    },
    
    ingress: {
      className: 'nginx',
      annotations: {
        'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
        'nginx.ingress.kubernetes.io/force-ssl-redirect': 'true',
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod'
      }
    }
  },
  
  // Database configuration
  database: {
    backup: {
      schedule: '0 2 * * *', // Daily at 2 AM
      compression: true,
      encryption: true,
      storage: {
        type: 's3',
        bucket: process.env.BACKUP_S3_BUCKET,
        region: process.env.AWS_REGION || 'us-east-1'
      }
    },
    
    migration: {
      autoRun: {
        development: true,
        staging: true,
        production: false // Require manual approval
      },
      rollback: {
        enabled: true,
        maxSteps: 5
      }
    }
  },
  
  // Monitoring and observability
  monitoring: {
    healthChecks: {
      interval: 30, // seconds
      timeout: 5, // seconds
      retries: 3,
      endpoints: [
        '/api/health',
        '/api/health/database',
        '/api/health/redis'
      ]
    },
    
    metrics: {
      prometheus: {
        enabled: true,
        endpoint: '/metrics',
        scrapeInterval: '15s'
      },
      
      customMetrics: [
        'http_requests_total',
        'http_request_duration_seconds',
        'database_connections_active',
        'task_operations_total',
        'user_sessions_active'
      ]
    },
    
    logging: {
      level: {
        development: 'debug',
        staging: 'info',
        production: 'warn'
      },
      
      aggregation: {
        enabled: true,
        service: 'elasticsearch',
        retention: {
          development: 7, // days
          staging: 30,
          production: 90
        }
      }
    },
    
    alerting: {
      channels: {
        slack: process.env.SLACK_WEBHOOK_URL,
        email: process.env.ALERT_EMAIL,
        pagerduty: process.env.PAGERDUTY_INTEGRATION_KEY
      },
      
      rules: [
        {
          name: 'High Error Rate',
          condition: 'error_rate > 5%',
          duration: '5m',
          severity: 'critical'
        },
        {
          name: 'High Response Time',
          condition: 'response_time_p95 > 2s',
          duration: '10m',
          severity: 'warning'
        },
        {
          name: 'Low Disk Space',
          condition: 'disk_usage > 85%',
          duration: '5m',
          severity: 'warning'
        },
        {
          name: 'Database Connection Issues',
          condition: 'db_connection_errors > 10',
          duration: '2m',
          severity: 'critical'
        }
      ]
    }
  },
  
  // Security configuration
  security: {
    scanning: {
      vulnerabilities: {
        enabled: true,
        tools: ['snyk', 'npm-audit'],
        failOnHigh: true,
        failOnMedium: false
      },
      
      secrets: {
        enabled: true,
        tools: ['truffleHog', 'git-secrets'],
        excludePatterns: [
          '*.test.js',
          '*.spec.js',
          'test-fixtures/*'
        ]
      },
      
      compliance: {
        enabled: true,
        standards: ['OWASP', 'CIS'],
        reportFormat: 'sarif'
      }
    },
    
    runtime: {
      waf: {
        enabled: true,
        rules: [
          'OWASP_CRS',
          'custom_rules'
        ]
      },
      
      rateLimiting: {
        enabled: true,
        rules: {
          api: '1000/hour',
          auth: '10/minute',
          upload: '5/minute'
        }
      }
    }
  },
  
  // Performance optimization
  performance: {
    caching: {
      redis: {
        enabled: true,
        ttl: {
          default: 3600, // 1 hour
          static: 86400, // 24 hours
          api: 300 // 5 minutes
        }
      },
      
      cdn: {
        enabled: true,
        provider: 'cloudflare',
        settings: {
          minify: true,
          compression: true,
          browserCache: 86400
        }
      }
    },
    
    optimization: {
      bundleAnalysis: true,
      treeshaking: true,
      codesplitting: true,
      lazyLoading: true,
      imageOptimization: true
    }
  },
  
  // Notification configuration
  notifications: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: '#deployments',
      username: 'DeployBot',
      events: [
        'deployment_started',
        'deployment_completed',
        'deployment_failed',
        'rollback_initiated',
        'quality_gate_failed'
      ]
    },
    
    email: {
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      
      recipients: {
        deployments: process.env.DEPLOYMENT_EMAIL_LIST?.split(',') || [],
        alerts: process.env.ALERT_EMAIL_LIST?.split(',') || [],
        reports: process.env.REPORT_EMAIL_LIST?.split(',') || []
      }
    }
  },
  
  // Quality gates configuration
  qualityGates: {
    preDeployment: {
      linting: true,
      unitTests: true,
      integrationTests: true,
      securityScan: true,
      performanceTests: false,
      accessibilityTests: false
    },
    
    postDeployment: {
      healthChecks: true,
      smokeTests: true,
      performanceValidation: true,
      securityValidation: true
    },
    
    thresholds: {
      testCoverage: 80,
      performanceScore: 90,
      securityScore: 95,
      accessibilityScore: 90
    }
  },
  
  // Rollback configuration
  rollback: {
    strategy: 'immediate',
    triggers: [
      'health_check_failure',
      'high_error_rate',
      'performance_degradation',
      'manual_trigger'
    ],
    
    retention: {
      maxVersions: 5,
      maxAge: 30 // days
    },
    
    validation: {
      healthChecks: true,
      smokeTests: true,
      dataIntegrity: true
    }
  }
};