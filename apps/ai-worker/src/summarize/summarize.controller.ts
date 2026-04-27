import { Body, Controller, Post } from '@nestjs/common';
import { SummarizeService } from './summarize.service.js';
import { SummarizeCardDto, SummarizeBoardDto } from './dto/summarize-card.dto.js';

@Controller('summarize')
export class SummarizeController {
  constructor(private readonly summarize: SummarizeService) {}

  @Post('card')
  summarizeCard(@Body() dto: SummarizeCardDto) {
    return this.summarize.summarizeCard(dto);
  }

  @Post('board')
  summarizeBoard(@Body() dto: SummarizeBoardDto) {
    return this.summarize.summarizeBoard(dto);
  }
}
