import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiagramsController, DiagramInvitationsPublicController } from './diagrams.controller.js';
import { DiagramsService } from './diagrams.service.js';
import { PusherModule } from '../pusher/pusher.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [PusherModule, EmailModule, ConfigModule],
  controllers: [DiagramsController, DiagramInvitationsPublicController],
  providers: [DiagramsService],
  exports: [DiagramsService],
})
export class DiagramsModule {}
