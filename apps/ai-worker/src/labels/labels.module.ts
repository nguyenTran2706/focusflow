import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { LabelsController } from './labels.controller.js';
import { LabelsService } from './labels.service.js';

@Module({
  imports: [AiModule],
  controllers: [LabelsController],
  providers: [LabelsService],
})
export class LabelsModule {}
