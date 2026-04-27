import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_PRICE_ID_PRO: 'price_pro',
      STRIPE_PRICE_ID_PRO_MAX: 'price_promax',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      CORS_ORIGIN: 'http://localhost:5173',
    };
    return map[key];
  }),
};

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession('u1', 'price_pro'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for invalid price ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        name: 'Test',
      });

      await expect(
        service.createCheckoutSession('u1', 'price_invalid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createPortalSession', () => {
    it('should throw if user has no Stripe customer ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        stripeCustomerId: null,
      });

      await expect(
        service.createPortalSession('u1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhook', () => {
    it('should throw on invalid signature', async () => {
      await expect(
        service.handleWebhook(Buffer.from('{}'), 'invalid-sig'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
