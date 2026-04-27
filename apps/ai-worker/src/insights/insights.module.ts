import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { InsightsController } from './insights.controller.js';
import { InsightsService } from './insights.service.js';

@Module({
  imports: [AiModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
