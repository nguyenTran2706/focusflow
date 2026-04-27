import { Body, Controller, Post } from '@nestjs/common';
import { RetroService } from './retro.service.js';
import { SprintRetroDto } from './dto/retro.dto.js';

@Controller('retro')
export class RetroController {
  constructor(private readonly retro: RetroService) {}

  @Post('sprint')
  generateRetro(@Body() dto: SprintRetroDto) {
    return this.retro.generateRetro(dto);
  }
}
