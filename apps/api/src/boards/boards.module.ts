import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BoardsController, BoardInvitationsPublicController } from './boards.controller.js';
import { BoardsService } from './boards.service.js';
import { PusherModule } from '../pusher/pusher.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [PusherModule, EmailModule, ConfigModule],
  controllers: [BoardsController, BoardInvitationsPublicController],
  providers: [BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}
