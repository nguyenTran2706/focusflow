import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { PusherService } from '../pusher/pusher.service.js';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ChatService {
  private anthropic: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly pusher: PusherService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY') ?? '',
    });
  }

  async getOrCreateChat(userId: string) {
    let chat = await this.prisma.chat.findFirst({
      where: { userId, status: { not: 'CLOSED' } },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 50 },
      },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: { userId },
        include: {
          messages: { orderBy: { createdAt: 'asc' }, take: 50 },
        },
      });
    }

    return chat;
  }

  async handleMessage(userId: string, chatId: string, body: string) {
    const userMsg = await this.prisma.chatMessage.create({
      data: { chatId, senderId: userId, senderRole: 'USER', body },
    });

    await this.pusher.trigger(`chat-${chatId}`, 'new-message', userMsg);

    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (chat?.status === 'HUMAN' || chat?.status === 'WAITING_HUMAN') {
      return { reply: null, source: 'waiting_human' };
    }

    const faqAnswer = await this.searchFaq(body);
    if (faqAnswer) {
      const msg = await this.prisma.chatMessage.create({
        data: { chatId, senderRole: 'BOT', body: faqAnswer },
      });
      await this.pusher.trigger(`chat-${chatId}`, 'new-message', msg);
      return { reply: msg, source: 'faq' };
    }

    const aiAnswer = await this.askAI(body, chatId);
    const msg = await this.prisma.chatMessage.create({
      data: { chatId, senderRole: 'BOT', body: aiAnswer },
    });
    await this.pusher.trigger(`chat-${chatId}`, 'new-message', msg);

    return { reply: msg, source: 'ai' };
  }

  private async searchFaq(question: string): Promise<string | null> {
    const keywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (keywords.length === 0) return null;

    const faqs = await this.prisma.faq.findMany();

    let bestMatch: { faq: (typeof faqs)[0]; score: number } | null = null;
    for (const faq of faqs) {
      const qLower = faq.question.toLowerCase();
      const score = keywords.filter((kw) => qLower.includes(kw)).length;
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { faq, score };
      }
    }

    if (bestMatch && bestMatch.score >= Math.ceil(keywords.length * 0.5)) {
      return bestMatch.faq.answer;
    }

    return null;
  }

  private async askAI(question: string, chatId: string): Promise<string> {
    try {
      const recentMessages = await this.prisma.chatMessage.findMany({
        where: { chatId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const conversationHistory = recentMessages
        .reverse()
        .map((m: { senderRole: string; body: string }) => ({
          role: (m.senderRole === 'USER' ? 'user' : 'assistant') as
            | 'user'
            | 'assistant',
          content: m.body,
        }));

      const model =
        this.config.get<string>('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-20250514';
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: 500,
        system:
          "You are FocusFlow's helpful assistant. FocusFlow is a Kanban board app for team productivity. " +
          "Be concise, friendly, and helpful. If you don't know something specific about the user's account, " +
          'suggest they contact support or use the "Talk to a human" button.',
        messages: conversationHistory,
      });

      const textBlock = response.content.find((c) => c.type === 'text');
      return textBlock && 'text' in textBlock
        ? textBlock.text
        : "Sorry, I couldn't generate a response. Please try again.";
    } catch {
      return 'I\'m having trouble connecting right now. Please try again later or click "Talk to a human" for live support.';
    }
  }

  async escalateToHuman(chatId: string) {
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { status: 'WAITING_HUMAN' },
    });

    const msg = await this.prisma.chatMessage.create({
      data: {
        chatId,
        senderRole: 'BOT',
        body: "I've connected you to our support team. An agent will be with you shortly!",
      },
    });

    await this.pusher.trigger(`chat-${chatId}`, 'new-message', msg);
    await this.pusher.trigger('admin-chats', 'chat-escalated', { chatId });

    return { status: 'waiting_human' };
  }
}
