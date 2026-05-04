import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BoardsService } from './boards.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PusherService } from '../pusher/pusher.service.js';
import { EmailService } from '../email/email.service.js';
import { AccessPolicyService } from '../billing/access-policy.service.js';

const mockPrisma = {
  membership: { findUnique: jest.fn() },
  user: { findUniqueOrThrow: jest.fn() },
  board: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  boardColumn: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  card: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  comment: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockPusher = {
  trigger: jest.fn().mockResolvedValue(undefined),
};

const mockEmail = {
  sendShareInvitation: jest.fn().mockResolvedValue(undefined),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('http://localhost:5173'),
};

const mockAccessPolicy = {
  assertWorkspaceAccessible: jest.fn().mockResolvedValue(undefined),
  stampWorkspaceAccess: jest.fn().mockResolvedValue(undefined),
  stampBoardAccess: jest.fn().mockResolvedValue(undefined),
  getAccessibleWorkspaceIds: jest.fn().mockResolvedValue({ ids: null, tier: 'PRO', capped: false }),
};

describe('BoardsService', () => {
  let service: BoardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PusherService, useValue: mockPusher },
        { provide: EmailService, useValue: mockEmail },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AccessPolicyService, useValue: mockAccessPolicy },
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
    jest.clearAllMocks();
  });

  describe('createBoard', () => {
    it('should create a board with default columns', async () => {
      const userId = 'user1';
      const workspaceId = 'ws1';
      mockPrisma.membership.findUnique.mockResolvedValue({ userId, workspaceId, role: 'MEMBER' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: userId, subscription: 'PRO' });
      mockPrisma.board.count.mockResolvedValue(0);
      mockPrisma.board.create.mockResolvedValue({
        id: 'board1',
        workspaceId,
        name: 'Test Board',
        columns: [
          { name: 'To Do', rank: '0', cards: [] },
          { name: 'In Progress', rank: '1', cards: [] },
          { name: 'Done', rank: '2', cards: [] },
        ],
      });

      const result = await service.createBoard(workspaceId, { name: 'Test Board' }, userId);

      expect(result.name).toBe('Test Board');
      expect(result.columns).toHaveLength(3);
      expect(mockPrisma.board.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Test Board', workspaceId }),
        }),
      );
    });

    it('should reject when not a workspace member', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(
        service.createBoard('ws1', { name: 'Test' }, 'user1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce free tier board limit', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1', workspaceId: 'ws1' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', subscription: 'FREE' });
      mockPrisma.board.count.mockResolvedValue(3);

      await expect(
        service.createBoard('ws1', { name: 'Over Limit' }, 'u1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getBoard', () => {
    it('should return a board with columns and cards', async () => {
      const board = {
        id: 'b1',
        workspaceId: 'ws1',
        columns: [{ id: 'c1', name: 'To Do', cards: [] }],
      };
      mockPrisma.board.findUnique.mockResolvedValue(board);
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1', workspaceId: 'ws1' });

      const result = await service.getBoard('b1', 'u1');
      expect(result.id).toBe('b1');
    });

    it('should throw NotFoundException for non-existent board', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(null);

      await expect(service.getBoard('missing', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCard', () => {
    it.skip('should create a card at the end of a column', async () => {
      mockPrisma.boardColumn.findUniqueOrThrow.mockResolvedValue({
        id: 'col1',
        boardId: 'b1',
        board: { workspaceId: 'ws1' },
      });
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.card.findFirst.mockResolvedValue({ rank: '5' });
      mockPrisma.card.create.mockResolvedValue({
        id: 'card1',
        title: 'New Card',
        columnId: 'col1',
        rank: '6',
      });

      const result = await service.createCard(
        'col1',
        { title: 'New Card' },
        'u1',
      );

      expect(result.title).toBe('New Card');
      expect(mockPrisma.card.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'New Card', rank: '6' }),
        }),
      );
    });
  });

  describe('moveCard', () => {
    it.skip('should move a card to a different column', async () => {
      mockPrisma.card.findUniqueOrThrow.mockResolvedValue({
        id: 'card1',
        columnId: 'col1',
        column: { boardId: 'b1', board: { workspaceId: 'ws1' } },
      });
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.card.update.mockResolvedValue({
        id: 'card1',
        columnId: 'col2',
        rank: '0',
      });

      const result = await service.moveCard(
        'card1',
        { targetColumnId: 'col2', rank: '0' },
        'u1',
      );

      expect(result.columnId).toBe('col2');
      expect(mockPusher.trigger).toHaveBeenCalledWith(
        'private-board-b1',
        'board.updated',
        expect.anything(),
        undefined,
      );
    });
  });

  describe('comments', () => {
    it.skip('should prevent editing another user\'s comment', async () => {
      mockPrisma.comment.findUniqueOrThrow.mockResolvedValue({
        id: 'cm1',
        authorId: 'other-user',
        card: { column: { board: { workspaceId: 'ws1' } } },
      });
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1' });

      await expect(
        service.updateComment('cm1', { body: 'edit' }, 'u1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it.skip('should allow editing own comment', async () => {
      mockPrisma.comment.findUniqueOrThrow.mockResolvedValue({
        id: 'cm1',
        authorId: 'u1',
        card: { column: { board: { workspaceId: 'ws1' } } },
      });
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.comment.update.mockResolvedValue({ id: 'cm1', body: 'updated' });

      const result = await service.updateComment('cm1', { body: 'updated' }, 'u1');
      expect(result.body).toBe('updated');
    });
  });
});
