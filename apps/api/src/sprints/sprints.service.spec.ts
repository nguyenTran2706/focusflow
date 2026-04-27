import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SprintsService } from './sprints.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PusherService } from '../pusher/pusher.service.js';

const mockPrisma = {
  membership: { findUnique: jest.fn() },
  user: { findUniqueOrThrow: jest.fn() },
  board: { findUnique: jest.fn() },
  sprint: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  card: {
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockPusher = { trigger: jest.fn().mockResolvedValue(undefined) };

const PRO_USER = { id: 'u1', subscription: 'PRO' };
const FREE_USER = { id: 'u1', subscription: 'FREE' };
const BOARD = { id: 'b1', workspaceId: 'ws1' };

describe('SprintsService', () => {
  let service: SprintsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PusherService, useValue: mockPusher },
      ],
    }).compile();

    service = module.get<SprintsService>(SprintsService);
    jest.clearAllMocks();
  });

  function setupProAccess() {
    mockPrisma.board.findUnique.mockResolvedValue(BOARD);
    mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1', workspaceId: 'ws1' });
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue(PRO_USER);
  }

  describe('createSprint', () => {
    it('should create a sprint with valid dates', async () => {
      setupProAccess();
      mockPrisma.sprint.create.mockResolvedValue({
        id: 's1',
        boardId: 'b1',
        name: 'Sprint 1',
        status: 'PLANNING',
      });

      const result = await service.createSprint(
        'b1',
        { name: 'Sprint 1', startDate: '2026-05-01', endDate: '2026-05-15' },
        'u1',
      );

      expect(result.name).toBe('Sprint 1');
      expect(mockPusher.trigger).toHaveBeenCalled();
    });

    it('should reject end date before start date', async () => {
      setupProAccess();

      await expect(
        service.createSprint(
          'b1',
          { name: 'Bad Sprint', startDate: '2026-05-15', endDate: '2026-05-01' },
          'u1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should deny free-tier users', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(BOARD);
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1', workspaceId: 'ws1' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(FREE_USER);

      await expect(
        service.createSprint(
          'b1',
          { name: 'Sprint', startDate: '2026-05-01', endDate: '2026-05-15' },
          'u1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('startSprint', () => {
    it('should start a PLANNING sprint', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue({
        id: 's1',
        boardId: 'b1',
        status: 'PLANNING',
        board: { workspaceId: 'ws1' },
      });
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(PRO_USER);
      mockPrisma.sprint.findFirst.mockResolvedValue(null);
      mockPrisma.sprint.update.mockResolvedValue({ id: 's1', status: 'ACTIVE' });

      const result = await service.startSprint('s1', 'u1');
      expect(result.status).toBe('ACTIVE');
    });

    it('should reject starting when another sprint is active', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue({
        id: 's1',
        boardId: 'b1',
        status: 'PLANNING',
        board: { workspaceId: 'ws1' },
      });
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(PRO_USER);
      mockPrisma.sprint.findFirst.mockResolvedValue({ id: 's-active', status: 'ACTIVE' });

      await expect(service.startSprint('s1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should reject starting an already ACTIVE sprint', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue({
        id: 's1',
        boardId: 'b1',
        status: 'ACTIVE',
        board: { workspaceId: 'ws1' },
      });
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(PRO_USER);

      await expect(service.startSprint('s1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeSprint', () => {
    it('should calculate velocity from completed cards', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue({
        id: 's1',
        boardId: 'b1',
        status: 'ACTIVE',
        board: { workspaceId: 'ws1' },
        cards: [
          { id: 'c1', storyPoints: 5, column: { name: 'Done' } },
          { id: 'c2', storyPoints: 3, column: { name: 'Done' } },
          { id: 'c3', storyPoints: 8, column: { name: 'In Progress' } },
        ],
      });
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(PRO_USER);
      mockPrisma.card.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.sprint.update.mockResolvedValue({ id: 's1', status: 'COMPLETED', velocity: 8 });

      const result = await service.completeSprint('s1', 'u1');
      expect(result.status).toBe('COMPLETED');
      expect(result.velocity).toBe(8);
    });

    it('should reject completing a PLANNING sprint', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue({
        id: 's1',
        boardId: 'b1',
        status: 'PLANNING',
        board: { workspaceId: 'ws1' },
        cards: [],
      });
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(PRO_USER);

      await expect(service.completeSprint('s1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('addCardsToSprint', () => {
    it('should reject adding cards to completed sprint', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue({
        id: 's1',
        boardId: 'b1',
        status: 'COMPLETED',
        board: { workspaceId: 'ws1' },
      });
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(PRO_USER);

      await expect(
        service.addCardsToSprint('s1', ['c1'], 'u1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSprint', () => {
    it('should throw NotFoundException for missing sprint', async () => {
      mockPrisma.sprint.findUnique.mockResolvedValue(null);

      await expect(service.getSprint('missing', 'u1')).rejects.toThrow(NotFoundException);
    });
  });
});
