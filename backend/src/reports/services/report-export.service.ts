import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import { Report } from '../entities/report.entity';
import { ReportAnalyticsService } from './report-analytics.service';
import { AnalyticsEventType } from '../entities/report-analytics.entity';

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  data: any[];
  report: Report;
  userId: string;
  includeCharts?: boolean;
  includeMetadata?: boolean;
  customTitle?: string;
}

@Injectable()
export class ReportExportService {
  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    private analyticsService: ReportAnalyticsService,
  ) {}

  async exportReport(options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      let result: ExportResult;
      
      switch (options.format) {
        case 'pdf':
          result = await this.exportToPDF(options);
          break;
        case 'excel':
          result = await this.exportToExcel(options);
          break;
        case 'csv':
          result = await this.exportToCSV(options);
          break;
        default:
          throw new BadRequestException('Formato de exportação não suportado');
      }
      
      const executionTime = Date.now() - startTime;
      
      // Registrar analytics
      await this.analyticsService.recordEvent({
        reportId: options.report.id,
        userId: options.userId,
        eventType: AnalyticsEventType.EXPORT,
        exportFormat: options.format as any,
        executionTime,
        recordCount: options.data.length,
        metadata: {
          fileSize: result.size,
          includeCharts: options.includeCharts,
          includeMetadata: options.includeMetadata,
        },
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Registrar erro no analytics
      await this.analyticsService.recordEvent({
        reportId: options.report.id,
        userId: options.userId,
        eventType: AnalyticsEventType.EXPORT,
        exportFormat: options.format as any,
        executionTime,
        recordCount: options.data.length,
        metadata: {
          errorMessage: error.message,
        },
      });
      
      throw error;
    }
  }

  private async exportToPDF(options: ExportOptions): Promise<ExportResult> {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve({
          buffer,
          filename: `${this.sanitizeFilename(options.report.name)}.pdf`,
          mimeType: 'application/pdf',
          size: buffer.length,
        });
      });
      
      doc.on('error', reject);
      
      try {
        // Cabeçalho
        doc.fontSize(20).text(options.customTitle || options.report.name, { align: 'center' });
        doc.moveDown();
        
        if (options.report.description) {
          doc.fontSize(12).text(options.report.description, { align: 'center' });
          doc.moveDown();
        }
        
        // Metadados
        if (options.includeMetadata) {
          doc.fontSize(10)
             .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' })
             .text(`Total de registros: ${options.data.length}`, { align: 'right' });
          doc.moveDown();
        }
        
        // Dados em tabela
        if (options.data.length > 0) {
          this.addTableToPDF(doc, options.data, options.report.fields);
        } else {
          doc.fontSize(12).text('Nenhum dado encontrado para os filtros aplicados.', { align: 'center' });
        }
        
        // Rodapé
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
             .text(`Página ${i + 1} de ${pageCount}`, 
                   doc.page.margins.left, 
                   doc.page.height - doc.page.margins.bottom + 10,
                   { align: 'center' });
        }
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addTableToPDF(doc: PDFKit.PDFDocument, data: any[], fields: any[]) {
    const tableTop = doc.y;
    const itemHeight = 20;
    const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
    
    // Cabeçalhos
    const columnWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / fields.length;
    
    doc.fontSize(10).fillColor('black');
    
    fields.forEach((field, i) => {
      doc.text(field.label, 
               doc.page.margins.left + (i * columnWidth), 
               tableTop, 
               { width: columnWidth, align: 'left' });
    });
    
    doc.moveDown();
    
    // Linha separadora
    doc.moveTo(doc.page.margins.left, doc.y)
       .lineTo(doc.page.width - doc.page.margins.right, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Dados
    data.forEach((row, rowIndex) => {
      if (doc.y + itemHeight > pageHeight) {
        doc.addPage();
        doc.y = doc.page.margins.top;
      }
      
      const rowY = doc.y;
      
      fields.forEach((field, colIndex) => {
        const value = this.formatCellValue(row[field.name], field.type);
        doc.text(value, 
                 doc.page.margins.left + (colIndex * columnWidth), 
                 rowY, 
                 { width: columnWidth - 5, align: 'left', ellipsis: true });
      });
      
      doc.y = rowY + itemHeight;
    });
  }

  private async exportToExcel(options: ExportOptions): Promise<ExportResult> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(options.report.name);
    
    // Metadados
    if (options.includeMetadata) {
      worksheet.addRow([options.customTitle || options.report.name]);
      worksheet.getRow(1).font = { size: 16, bold: true };
      worksheet.addRow([]);
      
      if (options.report.description) {
        worksheet.addRow([options.report.description]);
        worksheet.addRow([]);
      }
      
      worksheet.addRow([`Gerado em: ${new Date().toLocaleString('pt-BR')}`]);
      worksheet.addRow([`Total de registros: ${options.data.length}`]);
      worksheet.addRow([]);
    }
    
    // Cabeçalhos
    const headers = options.report.fields.map(field => field.label);
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    
    // Dados
    options.data.forEach(row => {
      const values = options.report.fields.map(field => {
        const value = row[field.name];
        return this.formatCellValue(value, field.type);
      });
      worksheet.addRow(values);
    });
    
    // Formatação das colunas
    options.report.fields.forEach((field, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = Math.max(field.label.length, 15);
      
      if (field.type === 'number') {
        column.numFmt = '#,##0.00';
      } else if (field.type === 'date') {
        column.numFmt = 'dd/mm/yyyy';
      }
    });
    
    // Auto-filtro
    const dataRange = worksheet.getRow(options.includeMetadata ? 8 : 1).number;
    worksheet.autoFilter = {
      from: { row: dataRange, column: 1 },
      to: { row: dataRange + options.data.length, column: options.report.fields.length },
    };
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    
    return {
      buffer,
      filename: `${this.sanitizeFilename(options.report.name)}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
    };
  }

  private async exportToCSV(options: ExportOptions): Promise<ExportResult> {
    const lines: string[] = [];
    
    // Metadados (como comentários)
    if (options.includeMetadata) {
      lines.push(`# ${options.customTitle || options.report.name}`);
      if (options.report.description) {
        lines.push(`# ${options.report.description}`);
      }
      lines.push(`# Gerado em: ${new Date().toLocaleString('pt-BR')}`);
      lines.push(`# Total de registros: ${options.data.length}`);
      lines.push('');
    }
    
    // Cabeçalhos
    const headers = options.report.fields.map(field => this.escapeCsvValue(field.label));
    lines.push(headers.join(','));
    
    // Dados
    options.data.forEach(row => {
      const values = options.report.fields.map(field => {
        const value = this.formatCellValue(row[field.name], field.type);
        return this.escapeCsvValue(value);
      });
      lines.push(values.join(','));
    });
    
    const content = lines.join('\n');
    const buffer = Buffer.from(content, 'utf-8');
    
    return {
      buffer,
      filename: `${this.sanitizeFilename(options.report.name)}.csv`,
      mimeType: 'text/csv',
      size: buffer.length,
    };
  }

  private formatCellValue(value: any, fieldType: string): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    switch (fieldType) {
      case 'date':
        return value instanceof Date ? value.toLocaleDateString('pt-BR') : String(value);
      case 'number':
        return typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value);
      case 'status':
        return this.translateStatus(String(value));
      default:
        return String(value);
    }
  }

  private translateStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pendente',
      'in_progress': 'Em Andamento',
      'completed': 'Concluído',
      'cancelled': 'Cancelado',
      'active': 'Ativo',
      'inactive': 'Inativo',
    };
    
    return statusMap[status] || status;
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  // Método para obter formatos suportados
  getSupportedFormats(): { format: string; label: string; mimeType: string }[] {
    return [
      { format: 'pdf', label: 'PDF', mimeType: 'application/pdf' },
      { format: 'excel', label: 'Excel (XLSX)', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { format: 'csv', label: 'CSV', mimeType: 'text/csv' },
    ];
  }

  // Método para validar se o formato é suportado
  isFormatSupported(format: string): boolean {
    return ['pdf', 'excel', 'csv'].includes(format);
  }
}

export default ReportExportService;