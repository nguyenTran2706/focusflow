import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { RetroController } from './retro.controller.js';
import { RetroService } from './retro.service.js';

@Module({
  imports: [AiModule],
  controllers: [RetroController],
  providers: [RetroService],
})
export class RetroModule {}
