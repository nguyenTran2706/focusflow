import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import Stripe from 'stripe';

const TIER_MAP: Record<string, 'PRO' | 'PRO_MAX'> = {};

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private priceIdPro: string;
  private priceIdProMax: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2026-03-25.dahlia',
    });
    this.priceIdPro = this.config.get<string>('STRIPE_PRICE_ID_PRO') ?? '';
    this.priceIdProMax = this.config.get<string>('STRIPE_PRICE_ID_PRO_MAX') ?? '';

    if (this.priceIdPro) TIER_MAP[this.priceIdPro] = 'PRO';
    if (this.priceIdProMax) TIER_MAP[this.priceIdProMax] = 'PRO_MAX';
  }

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

    return { url: session.url };
  }

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

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const userId = session.metadata?.userId;
          if (userId) {
            const sub = await this.stripe.subscriptions.retrieve(
              session.subscription as string,
            );
            const priceId = sub.items.data[0]?.price?.id;
            const tier = priceId ? TIER_MAP[priceId] : undefined;
            await this.prisma.user.update({
              where: { id: userId },
              data: {
                stripeSubscriptionId: sub.id,
                subscription: tier ?? 'PRO',
              },
            });
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
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
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await this.prisma.user.update({
            where: { id: userId },
            data: { subscription: 'FREE', stripeSubscriptionId: null },
          });
        }
        break;
      }
    }

    return { received: true };
  }
}
