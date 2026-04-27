import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PusherService } from '../pusher/pusher.service.js';

const mockPrisma = {
  chat: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  chatMessage: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  faq: {
    findMany: jest.fn(),
  },
};

const mockPusher = { trigger: jest.fn().mockResolvedValue(undefined) };

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      ANTHROPIC_API_KEY: 'test-key',
      ANTHROPIC_MODEL: 'claude-sonnet-4-6',
    };
    return map[key] ?? '';
  }),
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PusherService, useValue: mockPusher },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  describe('getOrCreateChat', () => {
    it('should return an existing open chat', async () => {
      const chat = { id: 'chat1', userId: 'u1', status: 'BOT', messages: [] };
      mockPrisma.chat.findFirst.mockResolvedValue(chat);

      const result = await service.getOrCreateChat('u1');
      expect(result.id).toBe('chat1');
      expect(mockPrisma.chat.create).not.toHaveBeenCalled();
    });

    it('should create a new chat if none exists', async () => {
      mockPrisma.chat.findFirst.mockResolvedValue(null);
      mockPrisma.chat.create.mockResolvedValue({ id: 'new-chat', userId: 'u1', messages: [] });

      const result = await service.getOrCreateChat('u1');
      expect(result.id).toBe('new-chat');
      expect(mockPrisma.chat.create).toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('should return FAQ answer when matched', async () => {
      mockPrisma.chatMessage.create.mockResolvedValue({ id: 'm1', body: 'test' });
      mockPrisma.chat.findUnique.mockResolvedValue({ status: 'BOT' });
      mockPrisma.faq.findMany.mockResolvedValue([
        { question: 'How does pricing work for teams?', answer: 'We have three tiers.' },
      ]);
      mockPrisma.chatMessage.create
        .mockResolvedValueOnce({ id: 'm1', body: 'How does pricing work?' })
        .mockResolvedValueOnce({ id: 'm2', body: 'We have three tiers.', senderRole: 'BOT' });

      const result = await service.handleMessage('u1', 'chat1', 'How does pricing work?');

      expect(result.source).toBe('faq');
      expect(mockPusher.trigger).toHaveBeenCalled();
    });

    it('should skip bot response when chat is in HUMAN mode', async () => {
      mockPrisma.chatMessage.create.mockResolvedValue({ id: 'm1', body: 'hello' });
      mockPrisma.chat.findUnique.mockResolvedValue({ status: 'HUMAN' });

      const result = await service.handleMessage('u1', 'chat1', 'hello');

      expect(result.source).toBe('waiting_human');
      expect(result.reply).toBeNull();
    });
  });

  describe('escalateToHuman', () => {
    it('should update chat status and notify admin channel', async () => {
      mockPrisma.chat.update.mockResolvedValue({ id: 'chat1', status: 'WAITING_HUMAN' });
      mockPrisma.chatMessage.create.mockResolvedValue({ id: 'm1', senderRole: 'BOT' });

      const result = await service.escalateToHuman('chat1');

      expect(result.status).toBe('waiting_human');
      expect(mockPusher.trigger).toHaveBeenCalledWith(
        'admin-chats',
        'chat-escalated',
        expect.objectContaining({ chatId: 'chat1' }),
      );
    });
  });

  describe('backToAI', () => {
    it('should reset chat to BOT status', async () => {
      mockPrisma.chat.update.mockResolvedValue({ id: 'chat1', status: 'BOT' });
      mockPrisma.chatMessage.create.mockResolvedValue({ id: 'm1', senderRole: 'BOT' });

      const result = await service.backToAI('chat1');
      expect(result.status).toBe('bot');
    });
  });
});
