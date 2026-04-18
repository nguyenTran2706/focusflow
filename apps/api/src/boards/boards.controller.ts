import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { BoardsService } from './boards.service.js';
import {
  CreateBoardDto,
  CreateColumnDto,
  CreateCardDto,
  UpdateCardDto,
  MoveCardDto,
  CreateCommentDto,
} from './dto/index.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  // ── Boards ────────────────────────────────────────────────────────────────

  @Post('workspaces/:workspaceId/boards')
  createBoard(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateBoardDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.createBoard(workspaceId, dto, user.userId);
  }

  @Get('workspaces/:workspaceId/boards')
  listBoards(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.listBoards(workspaceId, user.userId);
  }

  @Get('boards/:boardId')
  getBoard(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.getBoard(boardId, user.userId);
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  @Post('boards/:boardId/columns')
  createColumn(
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.createColumn(boardId, dto, user.userId);
  }

  // ── Cards ─────────────────────────────────────────────────────────────────

  @Post('columns/:columnId/cards')
  createCard(
    @Param('columnId') columnId: string,
    @Body() dto: CreateCardDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.createCard(columnId, dto, user.userId);
  }

  @Get('cards/:cardId')
  getCard(
    @Param('cardId') cardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.getCard(cardId, user.userId);
  }

  @Patch('cards/:cardId')
  updateCard(
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.updateCard(cardId, dto, user.userId);
  }

  @Patch('cards/:cardId/move')
  moveCard(
    @Param('cardId') cardId: string,
    @Body() dto: MoveCardDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.moveCard(cardId, dto, user.userId);
  }

  @Delete('cards/:cardId')
  deleteCard(
    @Param('cardId') cardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.deleteCard(cardId, user.userId);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  @Get('cards/:cardId/comments')
  listComments(
    @Param('cardId') cardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.listComments(cardId, user.userId);
  }

  @Post('cards/:cardId/comments')
  createComment(
    @Param('cardId') cardId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.createComment(cardId, dto, user.userId);
  }
}
