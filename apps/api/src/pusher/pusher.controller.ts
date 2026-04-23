import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { PusherService } from './pusher.service.js';

@UseGuards(ClerkAuthGuard)
@Controller('pusher')
export class PusherController {
  constructor(private readonly pusher: PusherService) {}

  @Post('auth')
  authenticate(
    @Body('socket_id') socketId: string,
    @Body('channel_name') channelName: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.pusher.authorizeChannel(socketId, channelName, user.userId);
  }
}
