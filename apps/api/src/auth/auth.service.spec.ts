import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockPrisma = {
  user: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('syncUser', () => {
    it('should upsert a user from Clerk data', async () => {
      const clerkData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
        name: 'Test User',
        imageUrl: 'https://img.example.com/avatar.jpg',
      };
      mockPrisma.user.upsert.mockResolvedValue({ id: 'u1', ...clerkData });

      const result = await service.syncUser(clerkData);

      expect(result.email).toBe('test@example.com');
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clerkId: 'clerk_123' },
        }),
      );
    });

    it('should handle duplicate email by linking to existing account', async () => {
      const error = { code: 'P2002' };
      mockPrisma.user.upsert.mockRejectedValue(error);
      mockPrisma.user.update.mockResolvedValue({
        id: 'u1',
        clerkId: 'clerk_new',
        email: 'existing@test.com',
      });

      const result = await service.syncUser({
        clerkId: 'clerk_new',
        email: 'existing@test.com',
        name: 'Test',
      });

      expect(result.clerkId).toBe('clerk_new');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'existing@test.com' },
        }),
      );
    });
  });

  describe('me', () => {
    it('should return user profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        name: 'Test',
        role: 'USER',
        subscription: 'FREE',
      });

      const result = await service.me('u1');
      expect(result.email).toBe('test@test.com');
    });

    it('should throw NotFoundException for missing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile fields', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'u1',
        name: 'Updated Name',
        phone: '+1234567890',
      });

      const result = await service.updateProfile('u1', {
        name: 'Updated Name',
        phone: '+1234567890',
      });

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('deleteUser', () => {
    it('should delete user by clerkId', async () => {
      mockPrisma.user.delete.mockResolvedValue({ id: 'u1' });

      const result = await service.deleteUser('clerk_123');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_123' },
      });
    });

    it('should return null if user not found', async () => {
      mockPrisma.user.delete.mockRejectedValue(new Error('not found'));

      const result = await service.deleteUser('missing');
      expect(result).toBeNull();
    });
  });
});
