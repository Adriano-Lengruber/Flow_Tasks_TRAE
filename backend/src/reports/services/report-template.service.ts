import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportTemplateService {
  getAvailableTemplates() {
    return [
      { id: 'table', name: 'Table Report', description: 'Standard table format' },
      { id: 'chart', name: 'Chart Report', description: 'Visual chart format' },
      { id: 'summary', name: 'Summary Report', description: 'Summarized data format' }
    ];
  }

  validateTemplate(templateId: string): boolean {
    const templates = this.getAvailableTemplates();
    return templates.some(template => template.id === templateId);
  }
}