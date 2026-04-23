import { Module } from '@nestjs/common';
import { WhiteboardsController } from './whiteboards.controller.js';
import { WhiteboardsService } from './whiteboards.service.js';
import { PusherModule } from '../pusher/pusher.module.js';

@Module({
  imports: [PusherModule],
  controllers: [WhiteboardsController],
  providers: [WhiteboardsService],
  exports: [WhiteboardsService],
})
export class WhiteboardsModule {}
