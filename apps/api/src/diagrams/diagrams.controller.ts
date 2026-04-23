import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { DiagramsService } from './diagrams.service.js';
import {
  CreateDiagramDto,
  UpdateDiagramDto,
  BroadcastDiagramDto,
} from './dto/index.js';

@UseGuards(ClerkAuthGuard)
@Controller()
export class DiagramsController {
  constructor(private readonly diagrams: DiagramsService) {}

  @Get('boards/:boardId/diagrams')
  list(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.listDiagrams(boardId, user.userId);
  }

  @Post('boards/:boardId/diagrams')
  create(
    @Param('boardId') boardId: string,
    @Body() dto: CreateDiagramDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.createDiagram(boardId, dto, user.userId);
  }

  @Get('diagrams/:id')
  get(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.getDiagram(id, user.userId);
  }

  @Patch('diagrams/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDiagramDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.diagrams.updateDiagram(id, dto, user.userId, socketId);
  }

  @Delete('diagrams/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.deleteDiagram(id, user.userId);
  }

  @Post('diagrams/:id/broadcast')
  broadcast(
    @Param('id') id: string,
    @Body() dto: BroadcastDiagramDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.broadcast(id, dto, user.userId);
  }
}
