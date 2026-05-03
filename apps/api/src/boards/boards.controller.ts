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
import { BoardsService } from './boards.service.js';
import {
  CreateBoardDto,
  UpdateBoardDto,
  CreateColumnDto,
  UpdateColumnDto,
  MoveColumnDto,
  CreateCardDto,
  UpdateCardDto,
  MoveCardDto,
  CreateCommentDto,
  UpdateCommentDto,
  InviteBoardCollaboratorsDto,
  UpdateBoardCollaboratorDto,
  UpdateBoardLinkAccessDto,
} from './dto/index.js';

@UseGuards(ClerkAuthGuard)
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

  @Patch('boards/:boardId')
  updateBoard(
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.updateBoard(boardId, dto, user.userId);
  }

  @Delete('boards/:boardId')
  deleteBoard(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.deleteBoard(boardId, user.userId);
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  @Post('boards/:boardId/columns')
  createColumn(
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.boards.createColumn(boardId, dto, user.userId, socketId);
  }

  @Patch('columns/:columnId')
  updateColumn(
    @Param('columnId') columnId: string,
    @Body() dto: UpdateColumnDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.boards.updateColumn(columnId, dto, user.userId, socketId);
  }

  @Delete('columns/:columnId')
  deleteColumn(
    @Param('columnId') columnId: string,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.boards.deleteColumn(columnId, user.userId, socketId);
  }

  @Patch('columns/:columnId/move')
  moveColumn(
    @Param('columnId') columnId: string,
    @Body() dto: MoveColumnDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.boards.moveColumn(columnId, dto, user.userId, socketId);
  }

  // ── Cards ─────────────────────────────────────────────────────────────────

  @Post('columns/:columnId/cards')
  createCard(
    @Param('columnId') columnId: string,
    @Body() dto: CreateCardDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.boards.createCard(columnId, dto, user.userId, socketId);
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
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.boards.updateCard(cardId, dto, user.userId, socketId);
  }

  @Patch('cards/:cardId/move')
  moveCard(
    @Param('cardId') cardId: string,
    @Body() dto: MoveCardDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.boards.moveCard(cardId, dto, user.userId, socketId);
  }

  @Delete('cards/:cardId')
  deleteCard(
    @Param('cardId') cardId: string,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.boards.deleteCard(cardId, user.userId, socketId);
  }

  @Post('cards/:cardId/duplicate')
  duplicateCard(
    @Param('cardId') cardId: string,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.boards.duplicateCard(cardId, user.userId, socketId);
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

  @Patch('comments/:commentId')
  updateComment(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.updateComment(commentId, dto, user.userId);
  }

  @Delete('comments/:commentId')
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.deleteComment(commentId, user.userId);
  }

  // ── Sharing ──────────────────────────────────────────────────────────

  @Get('boards/:boardId/share')
  getShare(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.getShareInfo(boardId, user.userId);
  }

  @Post('boards/:boardId/invitations')
  invite(
    @Param('boardId') boardId: string,
    @Body() dto: InviteBoardCollaboratorsDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.inviteCollaborators(boardId, dto, user.userId);
  }

  @Patch('boards/:boardId/collaborators/:userId')
  updateCollab(
    @Param('boardId') boardId: string,
    @Param('userId') collabUserId: string,
    @Body() dto: UpdateBoardCollaboratorDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.updateCollaborator(boardId, collabUserId, dto, user.userId);
  }

  @Delete('boards/:boardId/collaborators/:userId')
  removeCollab(
    @Param('boardId') boardId: string,
    @Param('userId') collabUserId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.removeCollaborator(boardId, collabUserId, user.userId);
  }

  @Delete('boards/:boardId/invitations/:invitationId')
  revokeInvite(
    @Param('boardId') boardId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.revokeInvitation(boardId, invitationId, user.userId);
  }

  @Patch('boards/:boardId/link-access')
  updateLinkAccess(
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardLinkAccessDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.updateLinkAccess(boardId, dto, user.userId);
  }

  @Post('boards/by-link/:token/join')
  joinByLink(
    @Param('token') token: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.joinByLink(token, user.userId);
  }

  @Post('invitations/board/:token/accept')
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.boards.acceptInvitationByToken(token, user.userId);
  }
}

@Controller()
export class BoardInvitationsPublicController {
  constructor(private readonly boards: BoardsService) {}

  @Get('invitations/board/:token')
  get(@Param('token') token: string) {
    return this.boards.getInvitationByToken(token);
  }
}
