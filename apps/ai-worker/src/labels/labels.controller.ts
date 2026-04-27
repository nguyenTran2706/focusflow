import { Body, Controller, Post } from '@nestjs/common';
import { LabelsService } from './labels.service.js';
import { AutoLabelDto } from './dto/auto-label.dto.js';

@Controller('labels')
export class LabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Post('auto')
  autoLabel(@Body() dto: AutoLabelDto) {
    return this.labels.autoLabel(dto);
  }
}
