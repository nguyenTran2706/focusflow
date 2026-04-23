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
import { SprintsService } from './sprints.service.js';
import { CreateSprintDto, UpdateSprintDto } from './dto/index.js';

@UseGuards(ClerkAuthGuard)
@Controller()
export class SprintsController {
  constructor(private readonly sprints: SprintsService) {}

  @Get('boards/:boardId/sprints')
  listSprints(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.sprints.listSprints(boardId, user.userId);
  }

  @Post('boards/:boardId/sprints')
  createSprint(
    @Param('boardId') boardId: string,
    @Body() dto: CreateSprintDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.sprints.createSprint(boardId, dto, user.userId, socketId);
  }

  @Get('boards/:boardId/backlog')
  getBacklog(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.sprints.getBacklog(boardId, user.userId);
  }

  @Get('boards/:boardId/velocity')
  getVelocity(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.sprints.getVelocity(boardId, user.userId);
  }

  @Get('sprints/:sprintId')
  getSprint(
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.sprints.getSprint(sprintId, user.userId);
  }

  @Patch('sprints/:sprintId')
  updateSprint(
    @Param('sprintId') sprintId: string,
    @Body() dto: UpdateSprintDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.sprints.updateSprint(sprintId, dto, user.userId, socketId);
  }

  @Delete('sprints/:sprintId')
  deleteSprint(
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.sprints.deleteSprint(sprintId, user.userId, socketId);
  }

  @Post('sprints/:sprintId/start')
  startSprint(
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.sprints.startSprint(sprintId, user.userId, socketId);
  }

  @Post('sprints/:sprintId/complete')
  completeSprint(
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.sprints.completeSprint(sprintId, user.userId, socketId);
  }

  @Post('sprints/:sprintId/cards')
  addCards(
    @Param('sprintId') sprintId: string,
    @Body() body: { cardIds: string[] },
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.sprints.addCardsToSprint(sprintId, body.cardIds, user.userId, socketId);
  }

  @Delete('sprints/:sprintId/cards/:cardId')
  removeCard(
    @Param('sprintId') sprintId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.sprints.removeCardFromSprint(sprintId, cardId, user.userId, socketId);
  }

  @Get('sprints/:sprintId/burndown')
  getBurndown(
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.sprints.getBurndown(sprintId, user.userId);
  }
}
