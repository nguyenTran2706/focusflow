import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { buildSubscriptionConfirmationHtml } from './templates/subscription-confirmation.js';
import {
  buildShareInvitationHtml,
  ShareInvitationEmailData,
} from './templates/share-invitation.js';

export interface SubscriptionEmailData {
  to: string;
  userName: string;
  planName: string;
  amount: string;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  startDate: Date;
  nextRenewalDate: Date;
  receiptUrl?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.fromEmail = this.config.get<string>('FROM_EMAIL') ?? 'onboarding@resend.dev';

    if (apiKey && apiKey !== 're_xxx') {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn('RESEND_API_KEY not configured — emails will be logged to console only');
    }
  }

  async sendSubscriptionConfirmation(data: SubscriptionEmailData): Promise<void> {
    const subject = `FocusFlow — Your ${data.planName} plan is active! 🎉`;
    const html = buildSubscriptionConfirmationHtml(data);

    if (!this.resend) {
      this.logger.log(`[EMAIL PREVIEW] To: ${data.to}`);
      this.logger.log(`[EMAIL PREVIEW] Subject: ${subject}`);
      this.logger.log(`[EMAIL PREVIEW] Plan: ${data.planName}, Amount: ${data.amount} ${data.currency}/${data.billingCycle}`);
      return;
    }

    try {
      const result = await this.resend.emails.send({
        from: `FocusFlow Team <${this.fromEmail}>`,
        to: data.to,
        subject,
        html,
      });
      this.logger.log(`Confirmation email sent to ${data.to} — id: ${(result as any).data?.id ?? 'unknown'}`);
    } catch (err) {
      this.logger.error(`Failed to send confirmation email to ${data.to}`, (err as Error).stack);
    }
  }

  async sendShareInvitation(data: ShareInvitationEmailData): Promise<void> {
    const subject = `${data.inviterName} invited you to "${data.resourceName}"`;
    const html = buildShareInvitationHtml(data);

    if (!this.resend) {
      this.logger.log(`[EMAIL PREVIEW] To: ${data.to} | ${subject} | ${data.acceptUrl}`);
      return;
    }

    try {
      const result = await this.resend.emails.send({
        from: `FocusFlow Team <${this.fromEmail}>`,
        to: data.to,
        subject,
        html,
      });
      this.logger.log(`Share invite (${data.resourceType}) sent to ${data.to} — id: ${(result as any).data?.id ?? 'unknown'}`);
    } catch (err) {
      this.logger.error(`Failed to send share invite to ${data.to}`, (err as Error).stack);
    }
  }

  // Backward-compat alias used by whiteboards.service.ts
  async sendWhiteboardInvitation(data: {
    to: string;
    inviterName: string;
    whiteboardName: string;
    role: 'VIEWER' | 'EDITOR';
    acceptUrl: string;
  }): Promise<void> {
    return this.sendShareInvitation({
      to: data.to,
      inviterName: data.inviterName,
      resourceType: 'whiteboard',
      resourceName: data.whiteboardName,
      role: data.role,
      acceptUrl: data.acceptUrl,
    });
  }
}
