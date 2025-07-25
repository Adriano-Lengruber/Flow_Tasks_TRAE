// Arquivo de índice para exportar funções factory dos serviços

import { PrismaClient } from '@prisma/client';
import { Server as HTTPServer } from 'http';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';
import { BackupService } from './backupService';
import { PerformanceAnalyzer } from './performanceAnalyzer';
import { IntegrationService } from './integrationService';
import { ReportService } from './reportService';
import { WorkflowService } from './workflowService';

// Factory function para AuditService
export function createAuditService(prisma: PrismaClient): AuditService {
  return new AuditService(prisma);
}

// Factory function para NotificationService
export function createNotificationService(server: HTTPServer, prisma: PrismaClient): NotificationService {
  return new NotificationService(server, prisma);
}

// Factory function para BackupService
export function createBackupService(prisma: PrismaClient): BackupService {
  return new BackupService(prisma);
}

// Factory function para PerformanceAnalyzer
export function createPerformanceAnalyzer(prisma: PrismaClient): PerformanceAnalyzer {
  return new PerformanceAnalyzer(prisma);
}

// Factory function para IntegrationService
export function createIntegrationService(prisma: PrismaClient): IntegrationService {
  return new IntegrationService(prisma);
}

// Factory function para ReportService
export function createReportService(prisma: PrismaClient): ReportService {
  return new ReportService(prisma);
}

// Factory function para WorkflowService
export function createWorkflowService(prisma: PrismaClient): WorkflowService {
  return new WorkflowService(prisma);
}

// Exportar todas as classes de serviço
export {
  AuditService,
  NotificationService,
  BackupService,
  PerformanceAnalyzer,
  IntegrationService,
  ReportService,
  WorkflowService
};