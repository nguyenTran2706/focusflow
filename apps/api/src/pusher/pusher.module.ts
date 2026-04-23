import { Global, Module } from '@nestjs/common';
import { PusherService } from './pusher.service.js';
import { PusherController } from './pusher.controller.js';

@Global()
@Module({
  controllers: [PusherController],
  providers: [PusherService],
  exports: [PusherService],
})
export class PusherModule {}
