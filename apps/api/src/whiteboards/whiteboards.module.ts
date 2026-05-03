import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhiteboardsController, WhiteboardInvitationsPublicController } from './whiteboards.controller.js';
import { WhiteboardsService } from './whiteboards.service.js';
import { PusherModule } from '../pusher/pusher.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [PusherModule, EmailModule, ConfigModule],
  controllers: [WhiteboardsController, WhiteboardInvitationsPublicController],
  providers: [WhiteboardsService],
  exports: [WhiteboardsService],
})
export class WhiteboardsModule {}
