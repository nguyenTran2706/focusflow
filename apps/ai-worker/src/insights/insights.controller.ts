import { Body, Controller, Post } from '@nestjs/common';
import { InsightsService } from './insights.service.js';
import { BoardInsightsDto } from './dto/insights.dto.js';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Post('board')
  analyzeBoard(@Body() dto: BoardInsightsDto) {
    return this.insights.analyzeBoard(dto);
  }
}
