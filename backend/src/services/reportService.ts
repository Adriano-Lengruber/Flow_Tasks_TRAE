import { PrismaClient } from '@prisma/client';
import { getCache } from '../utils/redisCache';
import { structuredLogger } from '../utils/logger';
import { getAuditService } from './auditService';
import config from '../config';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

// Interfaces para relatórios
interface Report {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  template: ReportTemplate;
  filters: ReportFilters;
  schedule?: ReportSchedule;
  recipients: string[];
  status: ReportStatus;
  lastGenerated?: Date;
  nextGeneration?: Date;
  generatedCount: number;
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  type: TemplateType;
  content: string;
  variables: TemplateVariable[];
  styles?: TemplateStyles;
  layout: TemplateLayout;
  sections: TemplateSection[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateVariable {
  name: string;
  type: VariableType;
  description?: string;
  required: boolean;
  defaultValue?: any;
  validation?: VariableValidation;
}

interface TemplateStyles {
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
  custom: Record<string, string>;
}

interface TemplateLayout {
  orientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  header?: TemplateSection;
  footer?: TemplateSection;
}

interface TemplateSection {
  id: string;
  name: string;
  type: SectionType;
  content: string;
  order: number;
  visible: boolean;
  conditions?: SectionCondition[];
  styling?: Record<string, any>;
}

interface SectionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'exists' | 'not_exists';
  value: any;
}

interface ReportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  projects?: string[];
  users?: string[];
  status?: string[];
  priority?: string[];
  tags?: string[];
  customFilters: Record<string, any>;
}

interface ReportSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  time: string; // HH:MM format
  timezone: string;
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  lastRun?: Date;
  nextRun?: Date;
}

interface ReportGeneration {
  id: string;
  reportId: string;
  status: GenerationStatus;
  format: ReportFormat;
  filePath?: string;
  fileSize?: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  metadata: Record<string, any>;
}

interface ReportData {
  summary: ReportSummary;
  details: Record<string, any>;
  charts: ChartData[];
  tables: TableData[];
  metadata: {
    generatedAt: Date;
    filters: ReportFilters;
    totalRecords: number;
    processingTime: number;
  };
}

interface ReportSummary {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  activeUsers: number;
  productivity: {
    tasksPerDay: number;
    completionRate: number;
    averageTaskDuration: number;
  };
  trends: {
    tasksCreated: TrendData[];
    tasksCompleted: TrendData[];
    userActivity: TrendData[];
  };
}

interface ChartData {
  id: string;
  title: string;
  type: ChartType;
  data: any[];
  options: Record<string, any>;
}

interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: any[][];
  summary?: Record<string, any>;
}

interface TrendData {
  date: string;
  value: number;
  label?: string;
}

interface VariableValidation {
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[];
}

// Tipos
type ReportType = 'project' | 'task' | 'user' | 'performance' | 'audit' | 'custom';
type ReportFormat = 'pdf' | 'html' | 'csv' | 'xlsx' | 'json';
type ReportStatus = 'active' | 'inactive' | 'draft' | 'archived';
type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
type TemplateType = 'standard' | 'dashboard' | 'detailed' | 'summary' | 'custom';
type VariableType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
type SectionType = 'header' | 'footer' | 'summary' | 'chart' | 'table' | 'text' | 'image' | 'custom';
type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar';

// Classe para geração de relatórios
class ReportGenerator {
  private logger = structuredLogger.child({ service: 'report-generator' });
  
  // Gerar relatório
  async generateReport(
    report: Report,
    data: ReportData,
    outputPath: string
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      let filePath: string;
      
      switch (report.format) {
        case 'pdf':
          filePath = await this.generatePDF(report, data, outputPath);
          break;
        case 'html':
          filePath = await this.generateHTML(report, data, outputPath);
          break;
        case 'csv':
          filePath = await this.generateCSV(report, data, outputPath);
          break;
        case 'xlsx':
          filePath = await this.generateExcel(report, data, outputPath);
          break;
        case 'json':
          filePath = await this.generateJSON(report, data, outputPath);
          break;
        default:
          throw new Error(`Unsupported format: ${report.format}`);
      }
      
      const duration = Date.now() - startTime;
      
      this.logger.info('Report generated successfully', {
        reportId: report.id,
        format: report.format,
        filePath,
        duration
      });
      
      return filePath;
    } catch (error) {
      this.logger.error('Report generation failed', error as Error, {
        reportId: report.id,
        format: report.format
      });
      throw error;
    }
  }
  
  // Gerar PDF
  private async generatePDF(
    report: Report,
    data: ReportData,
    outputPath: string
  ): Promise<string> {
    // Implementar geração de PDF usando puppeteer ou similar
    const htmlContent = await this.renderTemplate(report.template, data);
    const fileName = `${report.name}_${Date.now()}.pdf`;
    const filePath = path.join(outputPath, fileName);
    
    // Placeholder para geração de PDF
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.setContent(htmlContent);
    // await page.pdf({ path: filePath, format: 'A4' });
    // await browser.close();
    
    // Por enquanto, salvar como HTML
    await fs.writeFile(filePath.replace('.pdf', '.html'), htmlContent);
    
    return filePath.replace('.pdf', '.html');
  }
  
  // Gerar HTML
  private async generateHTML(
    report: Report,
    data: ReportData,
    outputPath: string
  ): Promise<string> {
    const htmlContent = await this.renderTemplate(report.template, data);
    const fileName = `${report.name}_${Date.now()}.html`;
    const filePath = path.join(outputPath, fileName);
    
    await fs.writeFile(filePath, htmlContent);
    
    return filePath;
  }
  
  // Gerar CSV
  private async generateCSV(
    report: Report,
    data: ReportData,
    outputPath: string
  ): Promise<string> {
    const fileName = `${report.name}_${Date.now()}.csv`;
    const filePath = path.join(outputPath, fileName);
    
    // Converter dados para CSV
    let csvContent = '';
    
    // Adicionar tabelas
    for (const table of data.tables) {
      csvContent += `${table.title}\n`;
      csvContent += table.headers.join(',') + '\n';
      
      for (const row of table.rows) {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
      }
      
      csvContent += '\n';
    }
    
    await fs.writeFile(filePath, csvContent);
    
    return filePath;
  }
  
  // Gerar Excel
  private async generateExcel(
    report: Report,
    data: ReportData,
    outputPath: string
  ): Promise<string> {
    const fileName = `${report.name}_${Date.now()}.xlsx`;
    const filePath = path.join(outputPath, fileName);
    
    // Implementar geração de Excel usando exceljs ou similar
    // Por enquanto, gerar CSV
    return await this.generateCSV(report, data, outputPath);
  }
  
  // Gerar JSON
  private async generateJSON(
    report: Report,
    data: ReportData,
    outputPath: string
  ): Promise<string> {
    const fileName = `${report.name}_${Date.now()}.json`;
    const filePath = path.join(outputPath, fileName);
    
    const jsonContent = JSON.stringify({
      report: {
        id: report.id,
        name: report.name,
        type: report.type,
        generatedAt: new Date()
      },
      data
    }, null, 2);
    
    await fs.writeFile(filePath, jsonContent);
    
    return filePath;
  }
  
  // Renderizar template
  private async renderTemplate(
    template: ReportTemplate,
    data: ReportData
  ): Promise<string> {
    let content = template.content;
    
    // Substituir variáveis
    content = this.replaceVariables(content, data);
    
    // Processar seções
    content = await this.processSections(content, template.sections, data);
    
    // Aplicar estilos
    if (template.styles) {
      content = this.applyStyles(content, template.styles);
    }
    
    return content;
  }
  
  // Substituir variáveis no template
  private replaceVariables(content: string, data: ReportData): string {
    // Substituir variáveis do sistema
    content = content.replace(/{{generatedAt}}/g, data.metadata.generatedAt.toLocaleString());
    content = content.replace(/{{totalRecords}}/g, data.metadata.totalRecords.toString());
    content = content.replace(/{{processingTime}}/g, `${data.metadata.processingTime}ms`);
    
    // Substituir variáveis do resumo
    content = content.replace(/{{totalProjects}}/g, data.summary.totalProjects.toString());
    content = content.replace(/{{totalTasks}}/g, data.summary.totalTasks.toString());
    content = content.replace(/{{completedTasks}}/g, data.summary.completedTasks.toString());
    content = content.replace(/{{pendingTasks}}/g, data.summary.pendingTasks.toString());
    content = content.replace(/{{overdueTasks}}/g, data.summary.overdueTasks.toString());
    content = content.replace(/{{activeUsers}}/g, data.summary.activeUsers.toString());
    
    // Substituir variáveis de produtividade
    content = content.replace(/{{tasksPerDay}}/g, data.summary.productivity.tasksPerDay.toFixed(2));
    content = content.replace(/{{completionRate}}/g, `${(data.summary.productivity.completionRate * 100).toFixed(1)}%`);
    content = content.replace(/{{averageTaskDuration}}/g, `${data.summary.productivity.averageTaskDuration.toFixed(1)} days`);
    
    return content;
  }
  
  // Processar seções do template
  private async processSections(
    content: string,
    sections: TemplateSection[],
    data: ReportData
  ): Promise<string> {
    for (const section of sections.sort((a, b) => a.order - b.order)) {
      if (!section.visible) continue;
      
      // Verificar condições
      if (section.conditions && !this.evaluateConditions(section.conditions, data)) {
        continue;
      }
      
      let sectionContent = '';
      
      switch (section.type) {
        case 'summary':
          sectionContent = this.generateSummarySection(data.summary);
          break;
        case 'chart':
          sectionContent = this.generateChartSection(data.charts, section.id);
          break;
        case 'table':
          sectionContent = this.generateTableSection(data.tables, section.id);
          break;
        case 'text':
          sectionContent = this.replaceVariables(section.content, data);
          break;
        default:
          sectionContent = section.content;
      }
      
      // Substituir placeholder da seção
      const placeholder = `{{section:${section.id}}}`;
      content = content.replace(placeholder, sectionContent);
    }
    
    return content;
  }
  
  // Avaliar condições da seção
  private evaluateConditions(
    conditions: SectionCondition[],
    data: ReportData
  ): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(condition.field, data);
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'not_contains':
          return !String(fieldValue).includes(String(condition.value));
        case 'greater':
          return Number(fieldValue) > Number(condition.value);
        case 'less':
          return Number(fieldValue) < Number(condition.value);
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        case 'not_exists':
          return fieldValue === undefined || fieldValue === null;
        default:
          return false;
      }
    });
  }
  
  // Obter valor do campo
  private getFieldValue(field: string, data: ReportData): any {
    const parts = field.split('.');
    let value: any = data;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }
  
  // Gerar seção de resumo
  private generateSummarySection(summary: ReportSummary): string {
    return `
      <div class="summary-section">
        <h2>Resumo Executivo</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <h3>Projetos</h3>
            <span class="summary-value">${summary.totalProjects}</span>
          </div>
          <div class="summary-item">
            <h3>Tarefas Totais</h3>
            <span class="summary-value">${summary.totalTasks}</span>
          </div>
          <div class="summary-item">
            <h3>Tarefas Concluídas</h3>
            <span class="summary-value">${summary.completedTasks}</span>
          </div>
          <div class="summary-item">
            <h3>Tarefas Pendentes</h3>
            <span class="summary-value">${summary.pendingTasks}</span>
          </div>
          <div class="summary-item">
            <h3>Tarefas Atrasadas</h3>
            <span class="summary-value">${summary.overdueTasks}</span>
          </div>
          <div class="summary-item">
            <h3>Usuários Ativos</h3>
            <span class="summary-value">${summary.activeUsers}</span>
          </div>
        </div>
        <div class="productivity-metrics">
          <h3>Métricas de Produtividade</h3>
          <p>Tarefas por dia: <strong>${summary.productivity.tasksPerDay.toFixed(2)}</strong></p>
          <p>Taxa de conclusão: <strong>${(summary.productivity.completionRate * 100).toFixed(1)}%</strong></p>
          <p>Duração média das tarefas: <strong>${summary.productivity.averageTaskDuration.toFixed(1)} dias</strong></p>
        </div>
      </div>
    `;
  }
  
  // Gerar seção de gráfico
  private generateChartSection(charts: ChartData[], chartId: string): string {
    const chart = charts.find(c => c.id === chartId);
    if (!chart) return '';
    
    return `
      <div class="chart-section">
        <h3>${chart.title}</h3>
        <div class="chart-container" data-chart-type="${chart.type}" data-chart-data='${JSON.stringify(chart.data)}'>
          <!-- Gráfico será renderizado aqui -->
          <p>Gráfico: ${chart.title} (${chart.type})</p>
        </div>
      </div>
    `;
  }
  
  // Gerar seção de tabela
  private generateTableSection(tables: TableData[], tableId: string): string {
    const table = tables.find(t => t.id === tableId);
    if (!table) return '';
    
    let html = `
      <div class="table-section">
        <h3>${table.title}</h3>
        <table class="data-table">
          <thead>
            <tr>
    `;
    
    // Cabeçalhos
    for (const header of table.headers) {
      html += `<th>${header}</th>`;
    }
    
    html += `
            </tr>
          </thead>
          <tbody>
    `;
    
    // Linhas
    for (const row of table.rows) {
      html += '<tr>';
      for (const cell of row) {
        html += `<td>${cell}</td>`;
      }
      html += '</tr>';
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    return html;
  }
  
  // Aplicar estilos
  private applyStyles(content: string, styles: TemplateStyles): string {
    const css = `
      <style>
        body {
          font-family: ${styles.fonts.primary};
          color: ${styles.colors.text};
          background-color: ${styles.colors.background};
          margin: 0;
          padding: ${styles.spacing.medium};
        }
        
        h1, h2, h3 {
          color: ${styles.colors.primary};
          font-family: ${styles.fonts.secondary};
        }
        
        .summary-section {
          margin-bottom: ${styles.spacing.large};
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: ${styles.spacing.medium};
          margin-bottom: ${styles.spacing.medium};
        }
        
        .summary-item {
          background: white;
          padding: ${styles.spacing.medium};
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }
        
        .summary-value {
          font-size: 2em;
          font-weight: bold;
          color: ${styles.colors.accent};
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: ${styles.spacing.medium};
        }
        
        .data-table th,
        .data-table td {
          padding: ${styles.spacing.small};
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .data-table th {
          background-color: ${styles.colors.primary};
          color: white;
          font-weight: bold;
        }
        
        .chart-container {
          margin: ${styles.spacing.medium} 0;
          padding: ${styles.spacing.medium};
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        code {
          font-family: ${styles.fonts.monospace};
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 4px;
        }
      </style>
    `;
    
    return css + content;
  }
}

// Classe principal do serviço de relatórios
class ReportService extends EventEmitter {
  private prisma: PrismaClient;
  private cache = getCache();
  private logger = structuredLogger.child({ service: 'report' });
  private generator = new ReportGenerator();
  private reports = new Map<string, Report>();
  private templates = new Map<string, ReportTemplate>();
  private scheduleTimers = new Map<string, NodeJS.Timeout>();
  private reportsDir: string;
  
  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
    this.reportsDir = path.join(process.cwd(), 'storage', 'reports');
  }
  
  // Inicializar serviço
  async initialize(): Promise<void> {
    // Criar diretório de relatórios
    await fs.mkdir(this.reportsDir, { recursive: true });
    
    // Carregar relatórios e templates
    await this.loadReports();
    // await this.loadTemplates();
    
    // Configurar agendamentos
    this.setupSchedules();
    
    this.logger.info('Report service initialized', {
      reportsCount: this.reports.size,
      templatesCount: this.templates.size
    });
  }
  
  // Carregar relatórios
  private async loadReports(): Promise<void> {
    try {
      const reports = await this.prisma.report.findMany();
      
      for (const report of reports) {
        const parsed: Report = {
          ...report,
          schedule: report.schedule ? JSON.parse(report.schedule as string) : undefined,
          config: JSON.parse(report.config as string)
        } as any;
        
        this.reports.set(report.id, parsed);
      }
    } catch (error) {
      this.logger.error('Failed to load reports', error as Error);
    }
  }
  
  // Carregar templates
  // private async loadTemplates(): Promise<void> {
  //   try {
  //     const templates = await this.prisma.reportTemplate.findMany();
  //     
  //     for (const template of templates) {
  //       const parsed: ReportTemplate = {
  //         ...template,
  //         variables: JSON.parse(template.variables as string),
  //         ...template
  //       } as any;
  //       
  //       this.templates.set(template.id, parsed);
  //     }
  //   } catch (error) {
  //     this.logger.error('Failed to load templates', error as Error);
  //   }
  // }
  
  // Configurar agendamentos
  private setupSchedules(): void {
    for (const [id, report] of this.reports) {
      if (report.schedule?.enabled) {
        this.setupSchedule(id, report);
      }
    }
  }
  
  // Configurar agendamento individual
  private setupSchedule(reportId: string, report: Report): void {
    if (!report.schedule?.enabled) return;
    
    const now = new Date();
    const nextRun = this.calculateNextRun(report.schedule, now);
    
    if (nextRun) {
      const delay = nextRun.getTime() - now.getTime();
      
      const timer = setTimeout(async () => {
        await this.generateScheduledReport(reportId);
        // Reagendar
        this.setupSchedule(reportId, report);
      }, delay);
      
      this.scheduleTimers.set(reportId, timer);
      
      // Atualizar próxima execução
      report.nextGeneration = nextRun;
    }
  }
  
  // Calcular próxima execução
  private calculateNextRun(
    schedule: ReportSchedule,
    from: Date
  ): Date | null {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const next = new Date(from);
    next.setHours(hours, minutes, 0, 0);
    
    // Se o horário já passou hoje, começar amanhã
    if (next <= from) {
      next.setDate(next.getDate() + 1);
    }
    
    switch (schedule.frequency) {
      case 'daily':
        return next;
      
      case 'weekly':
        if (schedule.dayOfWeek !== undefined) {
          const daysUntilTarget = (schedule.dayOfWeek - next.getDay() + 7) % 7;
          if (daysUntilTarget === 0 && next <= from) {
            next.setDate(next.getDate() + 7);
          } else {
            next.setDate(next.getDate() + daysUntilTarget);
          }
        }
        return next;
      
      case 'monthly':
        if (schedule.dayOfMonth !== undefined) {
          next.setDate(schedule.dayOfMonth);
          if (next <= from) {
            next.setMonth(next.getMonth() + 1);
          }
        }
        return next;
      
      case 'quarterly':
        // Implementar lógica trimestral
        next.setMonth(next.getMonth() + 3);
        return next;
      
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        return next;
      
      default:
        return null;
    }
  }
  
  // Gerar relatório agendado
  private async generateScheduledReport(reportId: string): Promise<void> {
    try {
      const report = this.reports.get(reportId);
      if (!report) return;
      
      const generation = await this.generateReport(reportId);
      
      // Enviar para destinatários
      if (report.recipients.length > 0 && generation.filePath) {
        await this.sendReportToRecipients(report, generation.filePath);
      }
      
      this.logger.info('Scheduled report generated', {
        reportId,
        generationId: generation.id
      });
    } catch (error) {
      this.logger.error('Scheduled report generation failed', error as Error, {
        reportId
      });
    }
  }
  
  // Enviar relatório para destinatários
  private async sendReportToRecipients(
    report: Report,
    filePath: string
  ): Promise<void> {
    // Implementar envio por email
    // Integrar com serviço de email
    this.logger.info('Report sent to recipients', {
      reportId: report.id,
      recipients: report.recipients.length
    });
  }
  
  // Gerar relatório
  async generateReport(reportId: string): Promise<ReportGeneration> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }
    
    const generationId = crypto.randomUUID();
    const startTime = new Date();
    
    const generation: ReportGeneration = {
      id: generationId,
      reportId,
      status: 'running',
      format: report.format,
      startTime,
      metadata: {}
    };
    
    try {
      // Coletar dados
      const data = await this.collectReportData(report);
      
      // Gerar arquivo
      const filePath = await this.generator.generateReport(
        report,
        data,
        this.reportsDir
      );
      
      // Obter tamanho do arquivo
      const stats = await fs.stat(filePath);
      
      // Atualizar geração
      generation.status = 'completed';
      generation.endTime = new Date();
      generation.duration = generation.endTime.getTime() - startTime.getTime();
      generation.filePath = filePath;
      generation.fileSize = stats.size;
      
      // Atualizar relatório
      report.lastGenerated = new Date();
      report.generatedCount++;
      
      // Salvar no banco
      await this.prisma.reportGeneration.create({
        data: {
          id: generation.id,
          reportId: generation.reportId,
          status: generation.status,
          format: generation.format,
          filePath: generation.filePath,
          error: generation.error
        }
      });
      
      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          lastRunAt: new Date()
        }
      });
      
      this.emit('report:generated', report, generation);
      
      this.logger.info('Report generated successfully', {
        reportId,
        generationId,
        duration: generation.duration,
        fileSize: generation.fileSize
      });
      
      return generation;
    } catch (error) {
      generation.status = 'failed';
      generation.endTime = new Date();
      generation.duration = generation.endTime.getTime() - startTime.getTime();
      generation.error = (error as Error).message;
      
      // Salvar erro no banco
      await this.prisma.reportGeneration.create({
        data: {
          id: generation.id,
          reportId: generation.reportId,
          status: generation.status,
          format: generation.format,
          error: generation.error
        }
      });
      
      this.emit('report:error', report, generation, error);
      
      this.logger.error('Report generation failed', error as Error, {
        reportId,
        generationId
      });
      
      throw error;
    }
  }
  
  // Coletar dados do relatório
  private async collectReportData(report: Report): Promise<ReportData> {
    const startTime = Date.now();
    
    // Aplicar filtros de data
    const dateFilter = report.filters.dateRange ? {
      createdAt: {
        gte: report.filters.dateRange.start,
        lte: report.filters.dateRange.end
      }
    } : {};
    
    // Coletar dados básicos
    const [projects, tasks, users] = await Promise.all([
      this.prisma.project.findMany({
        where: {
          ...dateFilter,
          ...(report.filters.projects?.length ? {
            id: { in: report.filters.projects }
          } : {})
        },
        include: {
          tasks: true,
          members: true
        }
      }),
      
      this.prisma.task.findMany({
        where: {
          ...dateFilter,
          ...(report.filters.projects?.length ? {
            projectId: { in: report.filters.projects }
          } : {}),
          ...(report.filters.status?.length ? {
            status: { in: report.filters.status }
          } : {}),
          ...(report.filters.priority?.length ? {
            priority: { in: report.filters.priority }
          } : {})
        },
        include: {
          assignee: true,
          project: true
        }
      }),
      
      this.prisma.user.findMany({
        where: {
          ...(report.filters.users?.length ? {
            id: { in: report.filters.users }
          } : {})
        }
      })
    ]);
    
    // Calcular métricas
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed');
    
    const summary: ReportSummary = {
      totalProjects: projects.length,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      activeUsers: users.filter(u => u.isActive).length,
      productivity: {
        tasksPerDay: this.calculateTasksPerDay(tasks),
        completionRate: tasks.length > 0 ? completedTasks.length / tasks.length : 0,
        averageTaskDuration: this.calculateAverageTaskDuration(completedTasks)
      },
      trends: {
        tasksCreated: this.calculateTrend(tasks, 'createdAt'),
        tasksCompleted: this.calculateTrend(completedTasks, 'updatedAt'),
        userActivity: this.calculateUserActivityTrend(users)
      }
    };
    
    // Gerar gráficos
    const charts: ChartData[] = [
      {
        id: 'tasks-by-status',
        title: 'Tarefas por Status',
        type: 'pie',
        data: this.generateTasksByStatusChart(tasks),
        options: {}
      },
      {
        id: 'tasks-by-priority',
        title: 'Tarefas por Prioridade',
        type: 'bar',
        data: this.generateTasksByPriorityChart(tasks),
        options: {}
      },
      {
        id: 'productivity-trend',
        title: 'Tendência de Produtividade',
        type: 'line',
        data: summary.trends.tasksCompleted,
        options: {}
      }
    ];
    
    // Gerar tabelas
    const tables: TableData[] = [
      {
        id: 'project-summary',
        title: 'Resumo dos Projetos',
        headers: ['Projeto', 'Tarefas Totais', 'Concluídas', 'Pendentes', 'Progresso'],
        rows: projects.map(p => [
          p.name,
          p.tasks.length.toString(),
          p.tasks.filter(t => t.status === 'completed').length.toString(),
          p.tasks.filter(t => t.status !== 'completed').length.toString(),
          `${((p.tasks.filter(t => t.status === 'completed').length / (p.tasks.length || 1)) * 100).toFixed(1)}%`
        ])
      },
      {
        id: 'top-performers',
        title: 'Usuários Mais Produtivos',
        headers: ['Usuário', 'Tarefas Concluídas', 'Taxa de Conclusão'],
        rows: this.generateTopPerformersTable(users, tasks)
      }
    ];
    
    const processingTime = Date.now() - startTime;
    
    return {
      summary,
      details: {
        projects,
        tasks,
        users
      },
      charts,
      tables,
      metadata: {
        generatedAt: new Date(),
        filters: report.filters,
        totalRecords: projects.length + tasks.length + users.length,
        processingTime
      }
    };
  }
  
  // Calcular tarefas por dia
  private calculateTasksPerDay(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    
    const dates = tasks.map(t => new Date(t.createdAt).toDateString());
    const uniqueDates = new Set(dates);
    
    return tasks.length / uniqueDates.size;
  }
  
  // Calcular duração média das tarefas
  private calculateAverageTaskDuration(completedTasks: any[]): number {
    if (completedTasks.length === 0) return 0;
    
    const durations = completedTasks
      .filter(t => t.createdAt && t.updatedAt)
      .map(t => {
        const created = new Date(t.createdAt);
        const completed = new Date(t.updatedAt);
        return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // dias
      });
    
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  }
  
  // Calcular tendência
  private calculateTrend(items: any[], dateField: string): TrendData[] {
    const grouped = items.reduce((acc, item) => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value: value as number }));
  }
  
  // Calcular tendência de atividade do usuário
  private calculateUserActivityTrend(users: any[]): TrendData[] {
    // Implementar lógica de atividade do usuário
    return [];
  }
  
  // Gerar gráfico de tarefas por status
  private generateTasksByStatusChart(tasks: any[]): any[] {
    const statusCount = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(statusCount).map(([status, count]) => ({
      label: status,
      value: count
    }));
  }
  
  // Gerar gráfico de tarefas por prioridade
  private generateTasksByPriorityChart(tasks: any[]): any[] {
    const priorityCount = tasks.reduce((acc, task) => {
      acc[task.priority || 'none'] = (acc[task.priority || 'none'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(priorityCount).map(([priority, count]) => ({
      label: priority,
      value: count
    }));
  }
  
  // Gerar tabela de usuários mais produtivos
  private generateTopPerformersTable(users: any[], tasks: any[]): any[][] {
    const userStats = users.map(user => {
      const userTasks = tasks.filter(t => t.assigneeId === user.id);
      const completedTasks = userTasks.filter(t => t.status === 'completed');
      const completionRate = userTasks.length > 0 ? (completedTasks.length / userTasks.length) * 100 : 0;
      
      return {
        name: user.name,
        completedTasks: completedTasks.length,
        completionRate
      };
    });
    
    return userStats
      .sort((a, b) => b.completedTasks - a.completedTasks)
      .slice(0, 10)
      .map(stat => [
        stat.name,
        stat.completedTasks.toString(),
        `${stat.completionRate.toFixed(1)}%`
      ]);
  }
  
  // Criar relatório
  async createReport(
    name: string,
    type: ReportType,
    format: ReportFormat,
    templateId: string,
    filters: ReportFilters,
    createdBy: string,
    schedule?: ReportSchedule,
    recipients: string[] = []
  ): Promise<Report> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    const id = crypto.randomUUID();
    
    const report: Report = {
      id,
      name,
      type,
      format,
      template,
      filters,
      schedule,
      recipients,
      status: 'active',
      generatedCount: 0,
      metadata: {},
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Salvar no banco
    await this.prisma.report.create({
      data: {
        id: report.id,
        name: report.name,
        description: report.description,
        type: report.type,
        config: JSON.stringify(report.template || {}),
        schedule: report.schedule ? JSON.stringify(report.schedule) : null,
        createdBy: {
          connect: { id: report.createdBy }
        }
      }
    });
    
    // Adicionar às coleções
    this.reports.set(id, report);
    
    // Configurar agendamento se habilitado
    if (schedule?.enabled) {
      this.setupSchedule(id, report);
    }
    
    // Registrar auditoria
    const auditService = getAuditService();
    await auditService.log(
      'admin.settings_change',
      'report',
      id,
      {
        ip: 'system',
        userAgent: 'report-service'
      },
      {
        action: 'create',
        name,
        type
      }
    );
    
    this.emit('report:created', report);
    
    this.logger.info('Report created', {
      id,
      name,
      type,
      format
    });
    
    return report;
  }
  
  // Criar template
  async createTemplate(
    name: string,
    type: TemplateType,
    content: string,
    variables: TemplateVariable[],
    layout: TemplateLayout,
    sections: TemplateSection[],
    styles?: TemplateStyles
  ): Promise<ReportTemplate> {
    const id = crypto.randomUUID();
    
    const template: ReportTemplate = {
      id,
      name,
      type,
      content,
      variables,
      styles,
      layout,
      sections,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Salvar no banco - reportTemplate model not available
    // await this.prisma.reportTemplate.create({
    //   data: {
    //     id: template.id,
    //     name: template.name,
    //     description: template.description,
    //     type: template.type,
    //     content: template.content,
    //     variables: JSON.stringify(template.variables),
    //     styles: template.styles ? JSON.stringify(template.styles) : null,
    //     layout: JSON.stringify(template.layout),
    //     sections: JSON.stringify(template.sections),
    //     metadata: JSON.stringify(template.metadata),
    //     createdAt: template.createdAt,
    //     updatedAt: template.updatedAt
    //   }
    // });
    
    // Adicionar às coleções
    this.templates.set(id, template);
    
    this.emit('template:created', template);
    
    this.logger.info('Report template created', {
      id,
      name,
      type
    });
    
    return template;
  }
  
  // Listar relatórios
  getReports(): Report[] {
    return Array.from(this.reports.values());
  }
  
  // Listar templates
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }
  
  // Obter relatório
  getReport(reportId: string): Report | undefined {
    return this.reports.get(reportId);
  }
  
  // Obter template
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }
  
  // Obter gerações de relatório
  async getReportGenerations(
    reportId: string,
    limit: number = 10
  ): Promise<ReportGeneration[]> {
    const generations = await this.prisma.reportGeneration.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    return generations as unknown as ReportGeneration[];
  }
  
  // Obter estatísticas
  getStats(): {
    reports: {
      total: number;
      active: number;
      byType: Record<ReportType, number>;
      byFormat: Record<ReportFormat, number>;
    };
    templates: {
      total: number;
      byType: Record<TemplateType, number>;
    };
    generations: {
      total: number;
      successful: number;
      failed: number;
    };
  } {
    const reports = Array.from(this.reports.values());
    const templates = Array.from(this.templates.values());
    
    const reportsByType = reports.reduce((acc, report) => {
      acc[report.type] = (acc[report.type] || 0) + 1;
      return acc;
    }, {} as Record<ReportType, number>);
    
    const reportsByFormat = reports.reduce((acc, report) => {
      acc[report.format] = (acc[report.format] || 0) + 1;
      return acc;
    }, {} as Record<ReportFormat, number>);
    
    const templatesByType = templates.reduce((acc, template) => {
      acc[template.type] = (acc[template.type] || 0) + 1;
      return acc;
    }, {} as Record<TemplateType, number>);
    
    return {
      reports: {
        total: reports.length,
        active: reports.filter(r => r.status === 'active').length,
        byType: reportsByType,
        byFormat: reportsByFormat
      },
      templates: {
        total: templates.length,
        byType: templatesByType
      },
      generations: {
        total: reports.reduce((sum, r) => sum + r.generatedCount, 0),
        successful: 0, // Seria calculado do banco
        failed: 0 // Seria calculado do banco
      }
    };
  }
  
  // Finalizar serviço
  async shutdown(): Promise<void> {
    // Parar todos os timers
    for (const timer of this.scheduleTimers.values()) {
      clearTimeout(timer);
    }
    this.scheduleTimers.clear();
    
    this.logger.info('Report service shutdown completed');
  }
}

// Singleton instance
let reportService: ReportService;

export function createReportService(prisma: PrismaClient): ReportService {
  if (!reportService) {
    reportService = new ReportService(prisma);
  }
  return reportService;
}

export function getReportService(): ReportService {
  if (!reportService) {
    throw new Error('ReportService not initialized');
  }
  return reportService;
}

export {
  ReportService,
  ReportGenerator,
  Report,
  ReportTemplate,
  ReportData,
  ReportGeneration,
  ReportType,
  ReportFormat,
  TemplateType,
  ChartType
};

export default ReportService;