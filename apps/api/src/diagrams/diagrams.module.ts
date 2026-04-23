import { Module } from '@nestjs/common';
import { DiagramsController } from './diagrams.controller.js';
import { DiagramsService } from './diagrams.service.js';
import { PusherModule } from '../pusher/pusher.module.js';

@Module({
  imports: [PusherModule],
  controllers: [DiagramsController],
  providers: [DiagramsService],
  exports: [DiagramsService],
})
export class DiagramsModule {}
