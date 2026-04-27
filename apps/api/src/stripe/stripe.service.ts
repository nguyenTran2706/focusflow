import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import Stripe from 'stripe';

const TIER_MAP: Record<string, 'PRO' | 'PRO_MAX'> = {};

const PLAN_DISPLAY: Record<string, { name: string; price: string }> = {
  PRO: { name: 'Pro', price: '$12' },
  PRO_MAX: { name: 'Pro Max', price: '$29' },
};

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private priceIdPro: string;
  private priceIdProMax: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2026-03-25.dahlia',
    });
    this.priceIdPro = this.config.get<string>('STRIPE_PRICE_ID_PRO') ?? '';
    this.priceIdProMax = this.config.get<string>('STRIPE_PRICE_ID_PRO_MAX') ?? '';

    if (this.priceIdPro) TIER_MAP[this.priceIdPro] = 'PRO';
    if (this.priceIdProMax) TIER_MAP[this.priceIdProMax] = 'PRO_MAX';
  }

  // ── Checkout ─────────────────────────────────────────────────────────────

  async createCheckoutSession(userId: string, priceId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (!TIER_MAP[priceId]) throw new BadRequestException('Invalid price');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
      this.logger.log(`Created Stripe customer ${customerId} for user ${userId}`);
    }

    const origin = this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173';
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/profile?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      subscription_data: { metadata: { userId: user.id } },
      metadata: { userId: user.id },
    });

    this.logger.log(`Checkout session created for user ${userId} — plan: ${TIER_MAP[priceId]}`);
    return { url: session.url };
  }

  // ── Customer Portal ──────────────────────────────────────────────────────

  async createPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      throw new BadRequestException('No active subscription to manage');
    }

    const origin = this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173';
    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/profile`,
    });

    return { url: session.url };
  }

  // ── Webhook Handler ──────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      this.logger.error('Invalid Stripe webhook signature');
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    // ── Idempotency check ────────────────────────────────────────────────
    const alreadyProcessed = await this.prisma.processedEvent.findUnique({
      where: { eventId: event.id },
    });
    if (alreadyProcessed) {
      this.logger.warn(`Duplicate webhook event ${event.id} (${event.type}) — skipping`);
      return { received: true, duplicate: true };
    }

    this.logger.log(`Processing webhook: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event);
          break;

        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }

      // Mark event as processed (idempotency)
      await this.prisma.processedEvent.create({
        data: { eventId: event.id, type: event.type },
      });
    } catch (err) {
      this.logger.error(`Error processing ${event.type}: ${(err as Error).message}`, (err as Error).stack);
      throw err;
    }

    return { received: true };
  }

  // ── Event Handlers ───────────────────────────────────────────────────────

  private async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== 'subscription' || !session.subscription) return;

    const userId = session.metadata?.userId;
    if (!userId) {
      this.logger.warn('checkout.session.completed missing userId in metadata');
      return;
    }

    const sub = await this.stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = sub.items.data[0]?.price?.id;
    const tier = priceId ? TIER_MAP[priceId] : undefined;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionId: sub.id,
        subscription: tier ?? 'PRO',
      },
    });

    this.logger.log(`User ${userId} upgraded to ${tier ?? 'PRO'} — subscription: ${sub.id}`);

    // ── Send confirmation email ──────────────────────────────────────────
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const planInfo = PLAN_DISPLAY[tier ?? 'PRO'] ?? { name: tier ?? 'Pro', price: '—' };

      // Try to get the latest invoice for receipt URL
      let receiptUrl: string | undefined;
      try {
        const invoices = await this.stripe.invoices.list({
          subscription: sub.id,
          limit: 1,
        });
        receiptUrl = invoices.data[0]?.hosted_invoice_url ?? undefined;
      } catch {
        this.logger.warn('Could not retrieve invoice for receipt URL');
      }

      const currentPeriodEnd = new Date((sub as any).current_period_end * 1000);

      await this.email.sendSubscriptionConfirmation({
        to: user.email,
        userName: user.name,
        planName: planInfo.name,
        amount: planInfo.price,
        currency: 'USD',
        billingCycle: 'monthly',
        startDate: new Date(),
        nextRenewalDate: currentPeriodEnd,
        receiptUrl,
      });
    }
  }

  private async handleSubscriptionUpdated(event: Stripe.Event) {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (!userId) {
      this.logger.warn('customer.subscription.updated missing userId in metadata');
      return;
    }

    const priceId = sub.items.data[0]?.price?.id;
    const tier = priceId ? TIER_MAP[priceId] : undefined;
    const active = sub.status === 'active' || sub.status === 'trialing';

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscription: active ? (tier ?? 'PRO') : 'FREE',
        stripeSubscriptionId: active ? sub.id : null,
      },
    });

    this.logger.log(
      `Subscription updated for user ${userId}: status=${sub.status}, tier=${active ? (tier ?? 'PRO') : 'FREE'}`,
    );
  }

  private async handleSubscriptionDeleted(event: Stripe.Event) {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (!userId) {
      this.logger.warn('customer.subscription.deleted missing userId in metadata');
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { subscription: 'FREE', stripeSubscriptionId: null },
    });

    this.logger.log(`Subscription cancelled for user ${userId} — reverted to FREE`);
  }

  private async handlePaymentFailed(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (user) {
      this.logger.warn(
        `Payment failed for user ${user.id} (${user.email}) — invoice: ${invoice.id}, ` +
        `attempt: ${invoice.attempt_count}, amount: ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency}`,
      );
    } else {
      this.logger.warn(`Payment failed for unknown customer ${customerId}`);
    }
  }
}
