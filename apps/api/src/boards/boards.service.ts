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
  MoveCardDto,
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
    return this.prisma.board.create({
      data: { workspaceId, name: dto.name },
      include: { columns: { include: { cards: true } } },
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
        rank,
      },
      include: {
        author: { select: { id: true, name: true } },
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
}
