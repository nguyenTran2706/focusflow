import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccessPolicyService } from '../billing/access-policy.service.js';

const mockPrisma = {
  user: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn() },
  workspace: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  membership: {
    count: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  invite: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  board: { findMany: jest.fn() },
};

const mockAccessPolicy = {
  assertWorkspaceAccessible: jest.fn().mockResolvedValue(undefined),
  stampWorkspaceAccess: jest.fn().mockResolvedValue(undefined),
  stampBoardAccess: jest.fn().mockResolvedValue(undefined),
  getAccessibleWorkspaceIds: jest.fn().mockResolvedValue({ ids: null, tier: 'PRO', capped: false }),
};

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccessPolicyService, useValue: mockAccessPolicy },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a workspace with OWNER membership', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', subscription: 'PRO' });
      mockPrisma.membership.count.mockResolvedValue(0);
      mockPrisma.workspace.findUnique.mockResolvedValue(null);
      mockPrisma.workspace.create.mockResolvedValue({
        id: 'ws1',
        name: 'My Team',
        slug: 'my-team',
        memberships: [{ userId: 'u1', role: 'OWNER' }],
      });

      const result = await service.create({ name: 'My Team', slug: 'my-team' }, 'u1');

      expect(result.name).toBe('My Team');
      expect(mockPrisma.workspace.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberships: { create: { userId: 'u1', role: 'OWNER' } },
          }),
        }),
      );
    });

    it('should enforce free tier workspace limit', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', subscription: 'FREE' });
      mockPrisma.membership.count.mockResolvedValue(3);

      await expect(
        service.create({ name: 'Over', slug: 'over' }, 'u1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate slugs', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', subscription: 'PRO' });
      mockPrisma.membership.count.mockResolvedValue(0);
      mockPrisma.workspace.findUnique.mockResolvedValue({ id: 'existing', slug: 'taken' });

      await expect(
        service.create({ name: 'Test', slug: 'taken' }, 'u1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOneOrFail', () => {
    it('should return workspace for members', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws1',
        memberships: [{ userId: 'u1', role: 'MEMBER' }],
      });

      const result = await service.findOneOrFail('ws1', 'u1');
      expect(result.id).toBe('ws1');
    });

    it('should throw NotFoundException for non-existent workspace', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      await expect(service.findOneOrFail('missing', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-members', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws1',
        memberships: [{ userId: 'other', role: 'OWNER' }],
      });

      await expect(service.findOneOrFail('ws1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should only allow owners to delete', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws1',
        memberships: [{ userId: 'u1', role: 'MEMBER' }],
      });

      await expect(service.delete('ws1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('invite', () => {
    it('should reject invites from regular members', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({ userId: 'u1', role: 'MEMBER' });

      await expect(
        service.invite('ws1', { email: 'new@test.com' }, 'u1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject invites for existing members', async () => {
      mockPrisma.membership.findUnique.mockResolvedValueOnce({ userId: 'u1', role: 'ADMIN' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', email: 'existing@test.com' });
      mockPrisma.membership.findUnique.mockResolvedValueOnce({ userId: 'u2', workspaceId: 'ws1' });

      await expect(
        service.invite('ws1', { email: 'existing@test.com' }, 'u1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('acceptInvite', () => {
    it('should reject expired invites', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        token: 'tok',
        acceptedAt: null,
        expiresAt: new Date('2020-01-01'),
        workspace: { name: 'Team' },
      });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', email: 'test@test.com' });

      await expect(service.acceptInvite('tok', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should reject already-accepted invites', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        token: 'tok',
        acceptedAt: new Date(),
        expiresAt: new Date('2099-01-01'),
        workspace: { name: 'Team' },
      });

      await expect(service.acceptInvite('tok', 'u1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getLimits', () => {
    it('should return correct limits for PRO tier', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', subscription: 'PRO' });
      mockPrisma.membership.count.mockResolvedValue(5);

      const result = await service.getLimits('u1');

      expect(result.tier).toBe('PRO');
      expect(result.limits.workspaces).toBe(10);
      expect(result.limits.scrum).toBe(true);
      expect(result.usage.workspaces).toBe(5);
    });
  });
});
