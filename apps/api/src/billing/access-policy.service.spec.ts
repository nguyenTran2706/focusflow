import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AccessPolicyService, WORKSPACE_LOCKED_CODE } from './access-policy.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockPrisma = {
  user: { findUniqueOrThrow: jest.fn() },
  membership: { findMany: jest.fn(), update: jest.fn() },
  board: { update: jest.fn() },
};

describe('AccessPolicyService', () => {
  let service: AccessPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessPolicyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AccessPolicyService>(AccessPolicyService);
    jest.clearAllMocks();
  });

  describe('getAccessibleWorkspaceIds', () => {
    it('returns null ids (unlimited) for PRO users', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ subscription: 'PRO' });

      const result = await service.getAccessibleWorkspaceIds('u1');

      expect(result.tier).toBe('PRO');
      expect(result.capped).toBe(false);
      expect(result.ids).toBeNull();
      expect(mockPrisma.membership.findMany).not.toHaveBeenCalled();
    });

    it('returns null ids (unlimited) for PRO_MAX users', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ subscription: 'PRO_MAX' });

      const result = await service.getAccessibleWorkspaceIds('u1');

      expect(result.tier).toBe('PRO_MAX');
      expect(result.capped).toBe(false);
      expect(result.ids).toBeNull();
    });

    it('returns 3 most-recent workspace ids for FREE users', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ subscription: 'FREE' });
      mockPrisma.membership.findMany.mockResolvedValue([
        { workspaceId: 'ws-newest' },
        { workspaceId: 'ws-mid' },
        { workspaceId: 'ws-oldest-unlocked' },
      ]);

      const result = await service.getAccessibleWorkspaceIds('u1');

      expect(result.tier).toBe('FREE');
      expect(result.capped).toBe(true);
      expect(result.ids).toEqual(new Set(['ws-newest', 'ws-mid', 'ws-oldest-unlocked']));
      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1' },
          orderBy: { lastAccessedAt: 'desc' },
          take: 3,
        }),
      );
    });

    it('returns empty set when FREE user has no workspaces', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ subscription: 'FREE' });
      mockPrisma.membership.findMany.mockResolvedValue([]);

      const result = await service.getAccessibleWorkspaceIds('u1');

      expect(result.capped).toBe(true);
      expect(result.ids?.size).toBe(0);
    });
  });

  describe('assertWorkspaceAccessible', () => {
    it('passes for PRO users on any workspace', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ subscription: 'PRO' });

      await expect(service.assertWorkspaceAccessible('u1', 'any')).resolves.toBeUndefined();
    });

    it('passes for FREE users on a recently-accessed workspace', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ subscription: 'FREE' });
      mockPrisma.membership.findMany.mockResolvedValue([
        { workspaceId: 'ws-allowed' },
        { workspaceId: 'ws-other' },
        { workspaceId: 'ws-third' },
      ]);

      await expect(service.assertWorkspaceAccessible('u1', 'ws-allowed')).resolves.toBeUndefined();
    });

    it('throws WORKSPACE_LOCKED_DOWNGRADE for FREE users on a locked workspace', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ subscription: 'FREE' });
      mockPrisma.membership.findMany.mockResolvedValue([
        { workspaceId: 'ws-1' },
        { workspaceId: 'ws-2' },
        { workspaceId: 'ws-3' },
      ]);

      await expect(service.assertWorkspaceAccessible('u1', 'ws-locked')).rejects.toThrow(
        ForbiddenException,
      );

      try {
        await service.assertWorkspaceAccessible('u1', 'ws-locked');
      } catch (err: any) {
        expect(err.getResponse().code).toBe(WORKSPACE_LOCKED_CODE);
      }
    });
  });

  describe('stamping', () => {
    it('stampWorkspaceAccess updates membership lastAccessedAt', async () => {
      mockPrisma.membership.update.mockResolvedValue({});

      await service.stampWorkspaceAccess('u1', 'ws1');

      expect(mockPrisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_workspaceId: { userId: 'u1', workspaceId: 'ws1' } },
          data: expect.objectContaining({ lastAccessedAt: expect.any(Date) }),
        }),
      );
    });

    it('stampBoardAccess updates board lastAccessedAt', async () => {
      mockPrisma.board.update.mockResolvedValue({});

      await service.stampBoardAccess('b1');

      expect(mockPrisma.board.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b1' },
          data: expect.objectContaining({ lastAccessedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
