import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { SummarizeController } from './summarize.controller.js';
import { SummarizeService } from './summarize.service.js';

@Module({
  imports: [AiModule],
  controllers: [SummarizeController],
  providers: [SummarizeService],
})
export class SummarizeModule {}
