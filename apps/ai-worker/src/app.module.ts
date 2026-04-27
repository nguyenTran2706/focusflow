import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SummarizeModule } from './summarize/summarize.module.js';
import { InsightsModule } from './insights/insights.module.js';
import { LabelsModule } from './labels/labels.module.js';
import { RetroModule } from './retro/retro.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    SummarizeModule,
    InsightsModule,
    LabelsModule,
    RetroModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
