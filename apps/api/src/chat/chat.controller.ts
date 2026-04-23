import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { PusherService } from '../pusher/pusher.service.js';

@Controller('chat')
@UseGuards(ClerkAuthGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly pusher: PusherService,
  ) {}

  @Get()
  getChat(@CurrentUser() user: { userId: string }) {
    return this.chat.getOrCreateChat(user.userId);
  }

  @Post('message')
  sendMessage(
    @CurrentUser() user: { userId: string },
    @Body() body: { chatId: string; message: string },
  ) {
    return this.chat.handleMessage(user.userId, body.chatId, body.message);
  }

  @Post('human')
  escalate(@Body() body: { chatId: string }) {
    return this.chat.escalateToHuman(body.chatId);
  }

  @Post('back-to-ai')
  backToAI(@Body() body: { chatId: string }) {
    return this.chat.backToAI(body.chatId);
  }

  @Post('pusher/auth')
  pusherAuth(
    @CurrentUser() user: { userId: string },
    @Body() body: { socket_id: string; channel_name: string },
  ) {
    return this.pusher.authorizeChannel(body.socket_id, body.channel_name, user.userId);
  }
}
