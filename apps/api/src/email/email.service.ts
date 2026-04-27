import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { buildSubscriptionConfirmationHtml } from './templates/subscription-confirmation.js';

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
        from: `FocusFlow <${this.fromEmail}>`,
        to: data.to,
        subject,
        html,
      });
      this.logger.log(`Confirmation email sent to ${data.to} — id: ${(result as any).data?.id ?? 'unknown'}`);
    } catch (err) {
      this.logger.error(`Failed to send confirmation email to ${data.to}`, (err as Error).stack);
      // Don't throw — email failure shouldn't break the checkout flow
    }
  }
}
