import { Injectable, Logger } from '@nestjs/common';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(options: EmailOptions): Promise<void> {
    // Implementação simulada do envio de email
    // Em produção, integrar com serviços como SendGrid, AWS SES, etc.
    this.logger.log(`Simulando envio de email para: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    this.logger.log(`Assunto: ${options.subject}`);
    
    if (options.attachments && options.attachments.length > 0) {
      this.logger.log(`Anexos: ${options.attachments.map(a => a.filename).join(', ')}`);
    }
    
    // Simular delay de envio
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.logger.log('Email enviado com sucesso (simulado)');
  }
}