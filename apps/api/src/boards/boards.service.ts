import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateBoardDto,
  CreateColumnDto,
  CreateCardDto,
  UpdateCardDto,
  MoveCardDto,
  CreateCommentDto,
} from './dto/index.js';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Membership guard ──────────────────────────────────────────────────────

  private async assertMember(workspaceId: string, userId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!m) throw new ForbiddenException('Not a member of this workspace');
    return m;
  }

  // ── Boards ────────────────────────────────────────────────────────────────

  async createBoard(workspaceId: string, dto: CreateBoardDto, userId: string) {
    await this.assertMember(workspaceId, userId);

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

  // ── Columns ───────────────────────────────────────────────────────────────

  async createColumn(boardId: string, dto: CreateColumnDto, userId: string) {
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

    return this.prisma.boardColumn.create({
      data: { boardId, name: dto.name, rank },
      include: { cards: true },
    });
  }

  // ── Cards ─────────────────────────────────────────────────────────────────

  async createCard(columnId: string, dto: CreateCardDto, userId: string) {
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

    return this.prisma.card.create({
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

  async updateCard(cardId: string, dto: UpdateCardDto, userId: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertMember(card.column.board.workspaceId, userId);

    return this.prisma.card.update({
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
      },
      include: {
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async moveCard(cardId: string, dto: MoveCardDto, userId: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertMember(card.column.board.workspaceId, userId);

    return this.prisma.card.update({
      where: { id: cardId },
      data: {
        columnId: dto.targetColumnId,
        rank: dto.rank,
      },
    });
  }

  async deleteCard(cardId: string, userId: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertMember(card.column.board.workspaceId, userId);

    return this.prisma.card.delete({ where: { id: cardId } });
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
}
