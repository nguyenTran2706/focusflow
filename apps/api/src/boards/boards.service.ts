import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
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
} from './dto/index.js';

import { PusherService } from '../pusher/pusher.service.js';

const TIER_LIMITS = {
  FREE: { boardsPerWorkspace: 3, scrum: false },
  PRO: { boardsPerWorkspace: 999, scrum: true },
  PRO_MAX: { boardsPerWorkspace: 999, scrum: true },
} as const;

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pusher: PusherService,
  ) {}

  // ── Membership guard ──────────────────────────────────────────────────────

  private async assertMember(workspaceId: string, userId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!m) throw new ForbiddenException('Not a member of this workspace');
    return m;
  }

  // ── Boards ────────────────────────────────────────────────────────────────

  private async getUserTier(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return user.subscription as keyof typeof TIER_LIMITS;
  }

  async createBoard(workspaceId: string, dto: CreateBoardDto, userId: string) {
    await this.assertMember(workspaceId, userId);

    const tier = await this.getUserTier(userId);
    const limits = TIER_LIMITS[tier];
    const boardCount = await this.prisma.board.count({ where: { workspaceId } });
    if (boardCount >= limits.boardsPerWorkspace) {
      throw new ForbiddenException(
        `Your ${tier} plan allows up to ${limits.boardsPerWorkspace} boards per workspace. Upgrade to create more.`,
      );
    }

    // Create board with 3 default Jira-style columns
    return this.prisma.board.create({
      data: {
        workspaceId,
        name: dto.name,
        columns: {
          create: [
            { name: 'To Do', rank: '0' },
            { name: 'In Progress', rank: '1' },
            { name: 'Done', rank: '2' },
          ],
        },
      },
      include: { columns: { include: { cards: true }, orderBy: { rank: 'asc' } } },
    });
  }

  async listBoards(workspaceId: string, userId: string) {
    await this.assertMember(workspaceId, userId);
    return this.prisma.board.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { columns: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBoard(boardId: string, userId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { rank: 'asc' },
          include: {
            cards: {
              orderBy: { rank: 'asc' },
              include: {
                author: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
                _count: { select: { comments: true } },
              },
            },
          },
        },
      },
    });
    if (!board) throw new NotFoundException('Board not found');
    await this.assertMember(board.workspaceId, userId);
    return board;
  }

  async updateBoard(boardId: string, dto: UpdateBoardDto, userId: string) {
    const board = await this.prisma.board.findUniqueOrThrow({ where: { id: boardId } });
    await this.assertMember(board.workspaceId, userId);

    return this.prisma.board.update({
      where: { id: boardId },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
    });
  }

  async deleteBoard(boardId: string, userId: string) {
    const board = await this.prisma.board.findUniqueOrThrow({ where: { id: boardId } });
    await this.assertMember(board.workspaceId, userId);

    return this.prisma.board.delete({ where: { id: boardId } });
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  async createColumn(boardId: string, dto: CreateColumnDto, userId: string, socketId?: string) {
    const board = await this.prisma.board.findUniqueOrThrow({
      where: { id: boardId },
    });
    await this.assertMember(board.workspaceId, userId);

    // Get the last rank to place the new column at the end
    const lastColumn = await this.prisma.boardColumn.findFirst({
      where: { boardId },
      orderBy: { rank: 'desc' },
      select: { rank: true },
    });
    const rank = lastColumn ? String(Number(lastColumn.rank) + 1) : '0';

    const column = await this.prisma.boardColumn.create({
      data: { boardId, name: dto.name, rank },
      include: { cards: true },
    });

    await this.pusher.trigger(`private-board-${boardId}`, 'board.updated', column, socketId);
    return column;
  }

  async updateColumn(columnId: string, dto: UpdateColumnDto, userId: string, socketId?: string) {
    const column = await this.prisma.boardColumn.findUniqueOrThrow({
      where: { id: columnId },
      include: { board: true },
    });
    await this.assertMember(column.board.workspaceId, userId);

    const updated = await this.prisma.boardColumn.update({
      where: { id: columnId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
      include: { cards: true },
    });

    await this.pusher.trigger(`private-board-${column.boardId}`, 'board.updated', updated, socketId);
    return updated;
  }

  async deleteColumn(columnId: string, userId: string, socketId?: string) {
    const column = await this.prisma.boardColumn.findUniqueOrThrow({
      where: { id: columnId },
      include: { board: true },
    });
    await this.assertMember(column.board.workspaceId, userId);

    const deleted = await this.prisma.boardColumn.delete({ where: { id: columnId } });
    await this.pusher.trigger(`private-board-${column.boardId}`, 'board.updated', { deletedColumnId: columnId }, socketId);
    return deleted;
  }

  async moveColumn(columnId: string, dto: MoveColumnDto, userId: string, socketId?: string) {
    const column = await this.prisma.boardColumn.findUniqueOrThrow({
      where: { id: columnId },
      include: { board: true },
    });
    await this.assertMember(column.board.workspaceId, userId);

    const updated = await this.prisma.boardColumn.update({
      where: { id: columnId },
      data: { rank: dto.rank },
    });

    await this.pusher.trigger(`private-board-${column.boardId}`, 'board.updated', updated, socketId);
    return updated;
  }

  // ── Cards ─────────────────────────────────────────────────────────────────

  async createCard(columnId: string, dto: CreateCardDto, userId: string, socketId?: string) {
    const column = await this.prisma.boardColumn.findUniqueOrThrow({
      where: { id: columnId },
      include: { board: true },
    });
    await this.assertMember(column.board.workspaceId, userId);

    // Place at end of column
    const lastCard = await this.prisma.card.findFirst({
      where: { columnId },
      orderBy: { rank: 'desc' },
      select: { rank: true },
    });
    const rank = lastCard ? String(Number(lastCard.rank) + 1) : '0';

    const card = await this.prisma.card.create({
      data: {
        columnId,
        authorId: userId,
        title: dto.title,
        body: dto.body,
        type: dto.type ?? 'task',
        priority: dto.priority,
        labels: dto.labels ?? [],
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        rank,
      },
      include: {
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    await this.pusher.trigger(`private-board-${column.boardId}`, 'board.updated', card, socketId);
    return card;
  }

  async getCard(cardId: string, userId: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: {
        column: { include: { board: true } },
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        },
        _count: { select: { comments: true } },
      },
    });
    await this.assertMember(card.column.board.workspaceId, userId);
    return card;
  }

  async updateCard(cardId: string, dto: UpdateCardDto, userId: string, socketId?: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertMember(card.column.board.workspaceId, userId);

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.labels !== undefined && { labels: dto.labels }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId || null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.sprintId !== undefined && { sprintId: dto.sprintId || null }),
        ...(dto.storyPoints !== undefined && { storyPoints: dto.storyPoints }),
      },
      include: {
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    });

    await this.pusher.trigger(`private-board-${card.column.boardId}`, 'board.updated', updated, socketId);
    return updated;
  }

  async moveCard(cardId: string, dto: MoveCardDto, userId: string, socketId?: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertMember(card.column.board.workspaceId, userId);

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: {
        columnId: dto.targetColumnId,
        rank: dto.rank,
      },
    });

    await this.pusher.trigger(`private-board-${card.column.boardId}`, 'board.updated', updated, socketId);
    return updated;
  }

  async deleteCard(cardId: string, userId: string, socketId?: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertMember(card.column.board.workspaceId, userId);

    const deleted = await this.prisma.card.delete({ where: { id: cardId } });
    await this.pusher.trigger(`private-board-${card.column.boardId}`, 'board.updated', { deletedCardId: cardId }, socketId);
    return deleted;
  }

  async duplicateCard(cardId: string, userId: string, socketId?: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: {
        column: { include: { board: true } },
      },
    });
    await this.assertMember(card.column.board.workspaceId, userId);

    // Provide a slightly higher rank
    const newRank = String(Number(card.rank) + 1);

    const newCard = await this.prisma.card.create({
      data: {
        columnId: card.columnId,
        authorId: userId,
        title: `${card.title} (Copy)`,
        body: card.body,
        type: card.type,
        priority: card.priority,
        labels: card.labels,
        assigneeId: card.assigneeId,
        dueDate: card.dueDate,
        startDate: card.startDate,
        storyPoints: card.storyPoints,
        rank: newRank,
      },
      include: {
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    await this.pusher.trigger(`private-board-${card.column.boardId}`, 'board.updated', newCard, socketId);
    return newCard;
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async listComments(cardId: string, userId: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertMember(card.column.board.workspaceId, userId);

    return this.prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async createComment(cardId: string, dto: CreateCommentDto, userId: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertMember(card.column.board.workspaceId, userId);

    return this.prisma.comment.create({
      data: {
        cardId,
        authorId: userId,
        body: dto.body,
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async updateComment(commentId: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.prisma.comment.findUniqueOrThrow({
      where: { id: commentId },
      include: { card: { include: { column: { include: { board: true } } } } },
    });
    await this.assertMember(comment.card.column.board.workspaceId, userId);

    // Only the author can edit their own comment
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { body: dto.body },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUniqueOrThrow({
      where: { id: commentId },
      include: { card: { include: { column: { include: { board: true } } } } },
    });
    await this.assertMember(comment.card.column.board.workspaceId, userId);

    // Only the author can delete their own comment
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.comment.delete({ where: { id: commentId } });
  }
}
