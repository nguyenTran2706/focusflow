import { Body, Controller, Get, Patch, Post, UseGuards, RawBodyRequest, Req, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ClerkAuthGuard } from './clerk-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import { Webhook } from 'svix';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('sync')
  @UseGuards(ClerkAuthGuard)
  syncUser(@Body() body: { clerkId: string; email: string; name: string; imageUrl?: string }) {
    return this.auth.syncUser(body);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() rawBody: any,
  ) {
    const webhookSecret = this.config.get<string>('CLERK_WEBHOOK_SECRET');

    if (webhookSecret) {
      try {
        const wh = new Webhook(webhookSecret);
        wh.verify(JSON.stringify(rawBody), {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    const { type, data } = rawBody;

    if (type === 'user.created' || type === 'user.updated') {
      await this.auth.syncUser({
        clerkId: data.id,
        email: data.email_addresses?.[0]?.email_address ?? '',
        name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'User',
        imageUrl: data.image_url,
      });
    }

    if (type === 'user.deleted') {
      await this.auth.deleteUser(data.id);
    }

    return { received: true };
  }

  @UseGuards(ClerkAuthGuard)
  @Get('me')
  me(@CurrentUser() user: { userId: string }) {
    return this.auth.me(user.userId);
  }

  @UseGuards(ClerkAuthGuard)
  @Patch('profile')
  updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() body: {
      name?: string;
      phone?: string;
      addressStreet?: string;
      addressCity?: string;
      addressState?: string;
      addressPostal?: string;
      addressCountry?: string;
    },
  ) {
    return this.auth.updateProfile(user.userId, body);
  }
}
