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
import { WhiteboardsService } from './whiteboards.service.js';
import {
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  BroadcastWhiteboardDto,
} from './dto/index.js';

@UseGuards(ClerkAuthGuard)
@Controller()
export class WhiteboardsController {
  constructor(private readonly whiteboards: WhiteboardsService) {}

  @Get('boards/:boardId/whiteboards')
  list(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.listWhiteboards(boardId, user.userId);
  }

  @Post('boards/:boardId/whiteboards')
  create(
    @Param('boardId') boardId: string,
    @Body() dto: CreateWhiteboardDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.createWhiteboard(boardId, dto, user.userId);
  }

  @Get('whiteboards/:id')
  get(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.getWhiteboard(id, user.userId);
  }

  @Patch('whiteboards/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWhiteboardDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.whiteboards.updateWhiteboard(id, dto, user.userId, socketId);
  }

  @Delete('whiteboards/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.deleteWhiteboard(id, user.userId);
  }

  @Post('whiteboards/:id/broadcast')
  broadcast(
    @Param('id') id: string,
    @Body() dto: BroadcastWhiteboardDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.broadcast(id, dto, user.userId);
  }
}
