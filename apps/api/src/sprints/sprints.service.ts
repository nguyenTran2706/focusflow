import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSprintDto, UpdateSprintDto } from './dto/index.js';

import { PusherService } from '../pusher/pusher.service.js';

@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pusher: PusherService,
  ) {}

  private async assertMember(workspaceId: string, userId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!m) throw new ForbiddenException('Not a member of this workspace');
    return m;
  }

  private async assertScrumAccess(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.subscription === 'FREE') {
      throw new ForbiddenException('Scrum boards require a Pro or Pro Max plan. Upgrade to access sprints.');
    }
  }

  private async getBoardWithAuth(boardId: string, userId: string) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    await this.assertMember(board.workspaceId, userId);
    await this.assertScrumAccess(userId);
    return board;
  }

  async listSprints(boardId: string, userId: string) {
    await this.getBoardWithAuth(boardId, userId);
    return this.prisma.sprint.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { cards: true } },
      },
    });
  }

  async getSprint(sprintId: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        board: true,
        cards: {
          orderBy: { rank: 'asc' },
          include: {
            author: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
            column: { select: { id: true, name: true } },
            _count: { select: { comments: true } },
          },
        },
      },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.assertMember(sprint.board.workspaceId, userId);
    return sprint;
  }

  async createSprint(boardId: string, dto: CreateSprintDto, userId: string, socketId?: string) {
    await this.getBoardWithAuth(boardId, userId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const sprint = await this.prisma.sprint.create({
      data: {
        boardId,
        name: dto.name,
        goal: dto.goal,
        startDate,
        endDate,
      },
      include: { _count: { select: { cards: true } } },
    });

    await this.pusher.trigger(`private-board-${boardId}`, 'sprint.updated', sprint, socketId);
    return sprint;
  }

  async updateSprint(sprintId: string, dto: UpdateSprintDto, userId: string, socketId?: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { board: true },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.assertMember(sprint.board.workspaceId, userId);

    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.goal !== undefined && { goal: dto.goal }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      },
      include: { _count: { select: { cards: true } } },
    });

    await this.pusher.trigger(`private-board-${sprint.boardId}`, 'sprint.updated', updated, socketId);
    return updated;
  }

  async deleteSprint(sprintId: string, userId: string, socketId?: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { board: true },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.assertMember(sprint.board.workspaceId, userId);

    // Unassign all cards from this sprint
    await this.prisma.card.updateMany({
      where: { sprintId },
      data: { sprintId: null },
    });

    const deleted = await this.prisma.sprint.delete({ where: { id: sprintId } });
    await this.pusher.trigger(`private-board-${sprint.boardId}`, 'sprint.updated', { deletedSprintId: sprintId }, socketId);
    return deleted;
  }

  async startSprint(sprintId: string, userId: string, socketId?: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { board: true },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.assertMember(sprint.board.workspaceId, userId);

    if (sprint.status !== 'PLANNING') {
      throw new BadRequestException('Only sprints in PLANNING can be started');
    }

    // Check no other active sprint on the same board
    const activeSprint = await this.prisma.sprint.findFirst({
      where: { boardId: sprint.boardId, status: 'ACTIVE' },
    });
    if (activeSprint) {
      throw new BadRequestException('Another sprint is already active on this board');
    }

    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: { status: 'ACTIVE' },
      include: { _count: { select: { cards: true } } },
    });

    await this.pusher.trigger(`private-board-${sprint.boardId}`, 'sprint.updated', updated, socketId);
    return updated;
  }

  async completeSprint(sprintId: string, userId: string, socketId?: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        board: true,
        cards: { include: { column: true } },
      },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.assertMember(sprint.board.workspaceId, userId);

    if (sprint.status !== 'ACTIVE') {
      throw new BadRequestException('Only ACTIVE sprints can be completed');
    }

    // Calculate velocity from completed cards (cards in "Done" columns)
    const completedPoints = sprint.cards
      .filter((c) => {
        const colName = c.column.name.toLowerCase();
        return colName === 'done' || colName === 'complete' || colName === 'completed';
      })
      .reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);

    // Move incomplete cards back to backlog (remove from sprint)
    const incompleteCards = sprint.cards.filter((c) => {
      const colName = c.column.name.toLowerCase();
      return colName !== 'done' && colName !== 'complete' && colName !== 'completed';
    });

    if (incompleteCards.length > 0) {
      await this.prisma.card.updateMany({
        where: { id: { in: incompleteCards.map((c) => c.id) } },
        data: { sprintId: null },
      });
    }

    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: 'COMPLETED',
        velocity: completedPoints,
      },
      include: { _count: { select: { cards: true } } },
    });

    await this.pusher.trigger(`private-board-${sprint.boardId}`, 'sprint.updated', updated, socketId);
    return updated;
  }

  async addCardsToSprint(sprintId: string, cardIds: string[], userId: string, socketId?: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { board: true },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.assertMember(sprint.board.workspaceId, userId);

    if (sprint.status === 'COMPLETED') {
      throw new BadRequestException('Cannot add cards to a completed sprint');
    }

    await this.prisma.card.updateMany({
      where: { id: { in: cardIds } },
      data: { sprintId },
    });

    await this.pusher.trigger(`private-board-${sprint.boardId}`, 'sprint.updated', { addCards: true, sprintId }, socketId);
    return { updated: cardIds.length };
  }

  async removeCardFromSprint(sprintId: string, cardId: string, userId: string, socketId?: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { board: true },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.assertMember(sprint.board.workspaceId, userId);

    await this.prisma.card.update({
      where: { id: cardId },
      data: { sprintId: null },
    });

    await this.pusher.trigger(`private-board-${sprint.boardId}`, 'sprint.updated', { removedCard: cardId, sprintId }, socketId);
    return { removed: true };
  }

  async getBacklog(boardId: string, userId: string) {
    await this.getBoardWithAuth(boardId, userId);

    return this.prisma.card.findMany({
      where: {
        column: { boardId },
        sprintId: null,
      },
      orderBy: { rank: 'asc' },
      include: {
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        column: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async getBurndown(sprintId: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        board: true,
        cards: { include: { column: true } },
      },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.assertMember(sprint.board.workspaceId, userId);

    const totalPoints = sprint.cards.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);
    const totalDays = Math.ceil(
      (sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Build ideal burndown line
    const ideal: { day: number; points: number }[] = [];
    for (let d = 0; d <= totalDays; d++) {
      ideal.push({ day: d, points: Math.round(totalPoints * (1 - d / totalDays)) });
    }

    // Build actual burndown from card completion dates
    const completedCards = sprint.cards.filter((c) => {
      const colName = c.column.name.toLowerCase();
      return colName === 'done' || colName === 'complete' || colName === 'completed';
    });
    const completedPoints = completedCards.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);

    const now = new Date();
    const elapsed = Math.min(
      totalDays,
      Math.ceil((now.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const actual: { day: number; points: number }[] = [
      { day: 0, points: totalPoints },
      { day: Math.max(1, elapsed), points: totalPoints - completedPoints },
    ];

    return { totalPoints, totalDays, ideal, actual, sprint };
  }

  async getVelocity(boardId: string, userId: string) {
    await this.getBoardWithAuth(boardId, userId);

    const completedSprints = await this.prisma.sprint.findMany({
      where: { boardId, status: 'COMPLETED' },
      orderBy: { endDate: 'asc' },
      take: 10,
      select: {
        id: true,
        name: true,
        velocity: true,
        startDate: true,
        endDate: true,
      },
    });

    const velocities = completedSprints.map((s) => s.velocity ?? 0);
    const avgVelocity =
      velocities.length > 0
        ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length)
        : 0;

    return { sprints: completedSprints, avgVelocity };
  }
}
