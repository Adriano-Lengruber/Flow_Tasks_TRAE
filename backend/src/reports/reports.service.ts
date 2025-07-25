import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReportDto, UpdateReportDto, ReportFilterDto, GenerateReportDto } from './dto/reports.dto';
import { Report } from './entities/report.entity';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
// import { Parser } from 'json2csv';
import { Cron, CronExpression } from '@nestjs/schedule';
// import { MailerService } from '@nestjs-modules/mailer';

interface ReportData {
  headers: string[];
  rows: any[][];
  metadata: {
    totalRecords: number;
    generatedAt: Date;
    filters: any;
  };
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    // private mailerService: MailerService
  ) {}

  async createReport(userId: string, createReportDto: CreateReportDto): Promise<Report> {
    try {
      const report = this.reportRepository.create({
        name: createReportDto.name,
        description: createReportDto.description,
        template: createReportDto.template,
        fields: createReportDto.fields || [],
        filters: createReportDto.filters || [],
        groupBy: createReportDto.groupBy,
        sortBy: createReportDto.sortBy,
        sortOrder: createReportDto.sortOrder || 'asc',
        createdById: userId,
      });

      return await this.reportRepository.save(report);
    } catch (error) {
      throw new BadRequestException('Erro ao criar relatório');
    }
  }

  async updateReport(id: string, userId: string, updateReportDto: UpdateReportDto): Promise<Report> {
    const existingReport = await this.reportRepository.findOne({
      where: { id, createdById: userId },
    });

    if (!existingReport) {
      throw new NotFoundException('Relatório não encontrado');
    }

    if (updateReportDto.name) existingReport.name = updateReportDto.name;
    if (updateReportDto.description) existingReport.description = updateReportDto.description;
    if (updateReportDto.template) existingReport.template = updateReportDto.template;
    if (updateReportDto.fields) existingReport.fields = updateReportDto.fields;
    if (updateReportDto.filters) existingReport.filters = updateReportDto.filters;
    if (updateReportDto.groupBy) existingReport.groupBy = updateReportDto.groupBy;
    if (updateReportDto.sortBy) existingReport.sortBy = updateReportDto.sortBy;
    if (updateReportDto.sortOrder) existingReport.sortOrder = updateReportDto.sortOrder;

    return await this.reportRepository.save(existingReport);
  }

  async deleteReport(id: string, userId: string): Promise<void> {
    const existingReport = await this.reportRepository.findOne({
      where: { id, createdById: userId },
    });

    if (!existingReport) {
      throw new NotFoundException('Relatório não encontrado');
    }

    await this.reportRepository.remove(existingReport);
  }

  async getReports(userId: string): Promise<Report[]> {
    return this.reportRepository.find({
      where: { createdById: userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getReport(id: string, userId: string): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id, createdById: userId },
    });

    if (!report) {
      throw new NotFoundException('Relatório não encontrado');
    }

    return report;
  }

  async generateReport(id: string, userId: string, generateDto: GenerateReportDto): Promise<ReportData> {
    const report = await this.getReport(id, userId);
    
    // Construir query baseada na configuração do relatório
    const queryBuilder = this.buildQuery(report, generateDto.filters);
    
    // Executar query
    const data = await this.executeQuery(queryBuilder);
    
    // Processar dados baseado no template
    const processedData = this.processDataByTemplate(data, report.template);
    
    return {
      headers: this.getHeaders(report.fields || []),
      rows: processedData,
      metadata: {
        totalRecords: processedData.length,
        generatedAt: new Date(),
        filters: generateDto.filters,
      },
    };
  }

  async exportReport(
    id: string,
    userId: string,
    format: 'pdf' | 'excel' | 'csv',
    filters?: ReportFilterDto[]
  ): Promise<Buffer> {
    const reportData = await this.generateReport(id, userId, { filters: filters || [] });
    
    switch (format) {
      case 'pdf':
        return this.generatePDF(reportData);
      case 'excel':
        return this.generateExcel(reportData);
      case 'csv':
        return this.generateCSV(reportData);
      default:
        throw new BadRequestException('Formato de exportação inválido');
    }
  }

  async scheduleReport(
    reportId: string,
    userId: string,
    schedule: {
      cronExpression: string;
      recipients: string[];
      format: 'pdf' | 'excel' | 'csv';
      enabled: boolean;
    }
  ): Promise<any> {
    // Simplified implementation - would need proper scheduling table
    return {
      id: 'temp-schedule-id',
      reportId,
      createdById: userId,
      ...schedule,
      createdAt: new Date(),
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledReports(): Promise<void> {
    // Simplified implementation - would process scheduled reports
    console.log('Processing scheduled reports...');
  }

  private buildQuery(report: Report, filters: ReportFilterDto[]): any {
    const fields = report.fields || [];
    const allFilters = filters || [];

    // Construir query TypeORM baseada nos campos e filtros
    const query: any = {
      select: {},
      where: {},
    };

    // Adicionar campos selecionados
    fields.forEach(field => {
      if (field.name.includes('.')) {
        // Campo relacionado
        const [relation, fieldName] = field.name.split('.');
        if (!query.select[relation]) {
          query.select[relation] = { select: {} };
        }
        query.select[relation].select[fieldName] = true;
      } else {
        query.select[field.name] = true;
      }
    });

    // Adicionar filtros
    allFilters.forEach(filter => {
      const whereCondition = this.buildWhereCondition(filter);
      Object.assign(query.where, whereCondition);
    });

    // Adicionar ordenação padrão
    query.orderBy = {
      createdAt: 'desc',
    };

    return query;
  }

  private buildWhereCondition(filter: ReportFilterDto): any {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      case 'greater':
        return { [field]: { gt: value } };
      case 'less':
        return { [field]: { lt: value } };
      case 'between':
        return { [field]: { gte: value[0], lte: value[1] } };
      case 'in':
        return { [field]: { in: Array.isArray(value) ? value : [value] } };
      default:
        return {};
    }
  }

  private async executeQuery(query: any): Promise<any[]> {
    // Implementação simplificada para demonstração
    // Em uma implementação real, seria necessário determinar a entidade correta
    // e executar a query TypeORM apropriada
    return [];
  }

  private processDataByTemplate(data: any[], template: string): any[][] {
    switch (template) {
      case 'table':
        return this.processTableData(data);
      case 'chart':
        return this.processChartData(data);
      case 'dashboard':
        return this.processDashboardData(data);
      case 'summary':
        return this.processSummaryData(data);
      default:
        return this.processTableData(data);
    }
  }

  private processTableData(data: any[]): any[][] {
    return data.map(item => {
      return Object.values(this.flattenObject(item));
    });
  }

  private processChartData(data: any[]): any[][] {
    // Processar dados para gráficos (agregações, etc.)
    return this.processTableData(data);
  }

  private processDashboardData(data: any[]): any[][] {
    // Processar dados para dashboard (métricas, KPIs, etc.)
    return this.processTableData(data);
  }

  private processSummaryData(data: any[]): any[][] {
    // Processar dados para resumo (estatísticas, totais, etc.)
    const summary = {
      total: data.length,
      // Adicionar mais estatísticas conforme necessário
    };
    
    return [[summary.total]];
  }

  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};
    
    for (const key in obj) {
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(flattened, this.flattenObject(obj[key], `${prefix}${key}.`));
      } else {
        flattened[`${prefix}${key}`] = obj[key];
      }
    }
    
    return flattened;
  }

  private getHeaders(fields: any[]): string[] {
    return fields.map(field => field.label || field.name);
  }

  private async generatePDF(reportData: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Título
      doc.fontSize(16).text('Relatório', { align: 'center' });
      doc.moveDown();

      // Metadados
      doc.fontSize(10)
         .text(`Gerado em: ${reportData.metadata.generatedAt.toLocaleString()}`)
         .text(`Total de registros: ${reportData.metadata.totalRecords}`);
      doc.moveDown();

      // Cabeçalhos
      doc.fontSize(8);
      const headerY = doc.y;
      let x = 50;
      reportData.headers.forEach(header => {
        doc.text(header, x, headerY, { width: 80 });
        x += 85;
      });
      doc.moveDown();

      // Dados
      reportData.rows.forEach(row => {
        const rowY = doc.y;
        x = 50;
        row.forEach(cell => {
          doc.text(String(cell || ''), x, rowY, { width: 80 });
          x += 85;
        });
        doc.moveDown(0.5);
      });

      doc.end();
    });
  }

  private async generateExcel(reportData: ReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');

    // Adicionar cabeçalhos
    worksheet.addRow(reportData.headers);

    // Adicionar dados
    reportData.rows.forEach(row => {
      worksheet.addRow(row);
    });

    // Estilizar cabeçalhos
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Auto-ajustar largura das colunas
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  async generateCSVReport(reportData: ReportData): Promise<string> {
    // Simple CSV generation without external library
    const headers = reportData.headers.join(',');
    const rows = reportData.rows.map(row => 
      row.map(cell => String(cell || '')).join(',')
    );
    return [headers, ...rows].join('\n');
  }

  private async generateCSV(reportData: ReportData): Promise<Buffer> {
    // Simple CSV generation without external library
    const headers = reportData.headers.join(',');
    const rows = reportData.rows.map(row => 
      row.map(cell => String(cell || '')).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    return Buffer.from(csv, 'utf-8');
  }

  private shouldExecuteNow(cronExpression: string): boolean {
    // Implementar lógica de verificação de cron
    // Por simplicidade, retornando true por enquanto
    return true;
  }

  private async sendReportByEmail(
    recipients: string[],
    reportName: string,
    reportBuffer: Buffer,
    format: string
  ): Promise<void> {
    // Email notification would be sent here
    console.log(`Email notification would be sent for scheduled report: ${reportName} to ${recipients.join(', ')}`);
  }
}

export default ReportsService;