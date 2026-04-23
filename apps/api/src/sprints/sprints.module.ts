import { Module } from '@nestjs/common';
import { SprintsController } from './sprints.controller.js';
import { SprintsService } from './sprints.service.js';
import { PusherModule } from '../pusher/pusher.module.js';

@Module({
  imports: [PusherModule],
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
