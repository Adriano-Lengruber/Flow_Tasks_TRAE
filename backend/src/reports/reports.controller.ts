import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Response,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import {
  CreateReportDto,
  UpdateReportDto,
  GenerateReportDto,
  ExportReportDto,
  ScheduleReportDto,
  CreateReportTemplateDto,
} from './dto/reports.dto';
import { ReportSchedule } from './entities/report-schedule.entity';
import { ReportAnalytics } from './entities/report-analytics.entity';
import { Response as ExpressResponse } from 'express';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // CRUD de Relatórios
  @Post()
  @ApiOperation({ summary: 'Criar novo relatório' })
  @ApiResponse({ status: 201, description: 'Relatório criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async createReport(
    @Body(ValidationPipe) createReportDto: CreateReportDto,
    @Request() req: any,
  ) {
    return this.reportsService.createReport(req.user.id, createReportDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar relatórios do usuário' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'template', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de relatórios' })
  async getReports(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('template') template?: string,
  ) {
    return this.reportsService.getReports(req.user.id);
  }

  @Get('public')
  @ApiOperation({ summary: 'Listar relatórios públicos' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de relatórios públicos' })
  async getPublicReports(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    // Public reports functionality not implemented yet
    return { reports: [], total: 0 };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter relatório por ID' })
  @ApiResponse({ status: 200, description: 'Relatório encontrado' })
  @ApiResponse({ status: 404, description: 'Relatório não encontrado' })
  async getReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.reportsService.getReport(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar relatório' })
  @ApiResponse({ status: 200, description: 'Relatório atualizado' })
  @ApiResponse({ status: 404, description: 'Relatório não encontrado' })
  async updateReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateReportDto: UpdateReportDto,
    @Request() req: any,
  ) {
    return this.reportsService.updateReport(id, req.user.id, updateReportDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir relatório' })
  @ApiResponse({ status: 200, description: 'Relatório excluído' })
  @ApiResponse({ status: 404, description: 'Relatório não encontrado' })
  async deleteReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.reportsService.deleteReport(id, req.user.id);
    return { message: 'Relatório excluído com sucesso' };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar relatório' })
  @ApiResponse({ status: 201, description: 'Relatório duplicado' })
  async duplicateReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<Report> {
    // Duplicate functionality not implemented yet
    throw new Error('Duplicate report functionality not implemented');
  }

  // Geração e Exportação
  @Post(':id/generate')
  @ApiOperation({ summary: 'Gerar dados do relatório' })
  @ApiResponse({ status: 200, description: 'Dados do relatório gerados' })
  async generateReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) generateDto: GenerateReportDto,
    @Request() req: any,
  ) {
    return this.reportsService.generateReport(id, JSON.stringify(generateDto.filters), req.user.id);
  }

  @Post(':id/export')
  @ApiOperation({ summary: 'Exportar relatório' })
  @ApiResponse({ status: 200, description: 'Arquivo exportado' })
  async exportReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) exportDto: ExportReportDto,
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    const result = await this.reportsService.exportReport(id, exportDto.format, req.user.id);
    
    const mimeType = exportDto.format === 'pdf' ? 'application/pdf' : 
                     exportDto.format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                     'text/csv';
    const filename = `report.${exportDto.format === 'excel' ? 'xlsx' : exportDto.format}`;
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(result));
    
    return res.send(result);
  }

  // Agendamento
  @Post(':id/schedule')
  @ApiOperation({ summary: 'Agendar relatório' })
  @ApiResponse({ status: 201, description: 'Agendamento criado' })
  async scheduleReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) scheduleDto: ScheduleReportDto,
    @Request() req: any,
  ) {
    return this.reportsService.scheduleReport(id, scheduleDto.cronExpression, req.user.id);
  }

  // Campos disponíveis
  @Get('fields/available')
  @ApiOperation({ summary: 'Listar campos disponíveis para relatórios' })
  @ApiResponse({ status: 200, description: 'Lista de campos disponíveis' })
  async getAvailableFields() {
    return { fields: ['id', 'name', 'description', 'type', 'createdAt', 'updatedAt'] };
  }
}

export default ReportsController;