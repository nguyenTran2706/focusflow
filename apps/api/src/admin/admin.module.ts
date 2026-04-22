import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminGuard } from './admin.guard.js';

@Module({
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
