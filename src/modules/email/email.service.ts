import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.pass'),
      },
    });
    this.loadTemplates();
  }

  private loadTemplates() {
    const templateDir = path.join(__dirname, 'templates');
    if (fs.existsSync(templateDir)) {
      const files = fs.readdirSync(templateDir).filter((f) => f.endsWith('.hbs'));
      for (const file of files) {
        const name = path.basename(file, '.hbs');
        const content = fs.readFileSync(path.join(templateDir, file), 'utf-8');
        this.templates.set(name, Handlebars.compile(content));
      }
    }
  }

  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const link = `${frontendUrl}/verify-email?token=${token}`;
    await this.sendTemplatedEmail(email, 'Verify your email', 'verification', { firstName, link });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const link = `${frontendUrl}/reset-password?token=${token}`;
    await this.sendTemplatedEmail(email, 'Reset your password', 'password-reset', { link });
  }

  async sendResearchApproved(email: string, firstName: string, researchTitle: string): Promise<void> {
    await this.sendTemplatedEmail(email, 'Research Approved', 'research-approved', { firstName, researchTitle });
  }

  async sendResearchRejected(email: string, firstName: string, researchTitle: string, reason?: string): Promise<void> {
    await this.sendTemplatedEmail(email, 'Research Status Update', 'research-rejected', { firstName, researchTitle, reason });
  }

  async sendPdfRequestNotification(authorEmail: string, requesterName: string, requesterEmail: string, researchTitle: string, purpose?: string): Promise<void> {
    await this.sendTemplatedEmail(authorEmail, 'PDF Request', 'pdf-request', { requesterName, requesterEmail, researchTitle, purpose });
  }

  async sendPdfDelivery(requesterEmail: string, requesterName: string, researchTitle: string): Promise<void> {
    await this.sendTemplatedEmail(requesterEmail, 'PDF Delivered', 'pdf-delivery', { requesterName, researchTitle });
  }

  private async sendTemplatedEmail(to: string, subject: string, templateName: string, context: Record<string, any>): Promise<void> {
    const template = this.templates.get(templateName);
    const html = template ? template(context) : this.fallbackHtml(subject, context);

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('email.from'),
        to,
        subject: `${subject} - NCF Research Repository`,
        html,
      });
    } catch (error) {
      this.logger.warn(`Failed to send email to ${to}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private fallbackHtml(subject: string, _context: Record<string, any>): string {
    return `<h2>${subject}</h2><p>Please check your dashboard for more information.</p>`;
  }
}
