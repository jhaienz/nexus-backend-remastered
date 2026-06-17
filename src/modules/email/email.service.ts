import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private config: ConfigService) {
    this.resend = new Resend(config.getOrThrow('RESEND_API_KEY'));
    this.from = config.getOrThrow('EMAIL_FROM');
    this.frontendUrl = config.getOrThrow('FRONTEND_URL');
  }

  async sendVerificationEmail(to: string, token: string) {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Verify your email — NCF Research Nexus',
      html: `<p>Click the link below to verify your email address:</p>
             <p><a href="${url}">Verify Email</a></p>
             <p>This link expires in 24 hours.</p>`,
    });
  }

  async sendPasswordResetCode(to: string, code: string) {
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Password Reset Code — NCF Research Nexus',
      html: `<p>Your password reset code is:</p>
             <h2>${code}</h2>
             <p>This code expires in 15 minutes.</p>`,
    });
  }

  async sendPdfRequestNotification(
    to: string,
    requesterName: string,
    researchTitle: string,
  ) {
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `PDF Request for "${researchTitle}" — NCF Research Nexus`,
      html: `<p><strong>${requesterName}</strong> has requested access to the PDF of your research paper:</p>
             <p><em>${researchTitle}</em></p>
             <p>Log in to your dashboard to approve or reject this request.</p>`,
    });
  }

  async sendPdfApproval(
    to: string,
    downloadUrl: string,
    researchTitle: string,
  ) {
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `PDF Access Approved — ${researchTitle}`,
      html: `<p>Your request for the PDF of <em>${researchTitle}</em> has been approved.</p>
             <p><a href="${downloadUrl}">Download PDF</a></p>
             <p>This link expires in 24 hours.</p>`,
    });
  }

  async sendPdfRejection(to: string, researchTitle: string) {
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `PDF Access Denied — ${researchTitle}`,
      html: `<p>Your request for the PDF of <em>${researchTitle}</em> has been denied by the author.</p>`,
    });
  }
}
