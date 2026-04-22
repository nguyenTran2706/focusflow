import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';
import { StripeService } from './stripe.service.js';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { Request } from 'express';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripe: StripeService) {}

  @Post('checkout')
  @UseGuards(ClerkAuthGuard)
  createCheckout(
    @CurrentUser() user: { userId: string },
    @Body('priceId') priceId: string,
  ) {
    return this.stripe.createCheckoutSession(user.userId, priceId);
  }

  @Post('webhook')
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const raw = req.rawBody;
    if (!raw) throw new Error('Missing raw body for webhook');
    return this.stripe.handleWebhook(raw, signature);
  }

  @Post('portal')
  @UseGuards(ClerkAuthGuard)
  createPortal(@CurrentUser() user: { userId: string }) {
    return this.stripe.createPortalSession(user.userId);
  }
}
