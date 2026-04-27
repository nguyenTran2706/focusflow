import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PusherService } from '../pusher/pusher.service.js';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { AdminGuard } from './admin.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@Controller('admin')
@UseGuards(ClerkAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pusher: PusherService,
  ) {}

  // ─── Dashboard Stats ──────────────────────────────────────────────

  @Get('stats')
  async getStats() {
    const [totalUsers, freeUsers, proUsers, proMaxUsers, activeChats, totalFaqs] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { subscription: 'FREE' } }),
        this.prisma.user.count({ where: { subscription: 'PRO' } }),
        this.prisma.user.count({ where: { subscription: 'PRO_MAX' } }),
        this.prisma.chat.count({ where: { status: { in: ['BOT', 'WAITING_HUMAN', 'HUMAN'] } } }),
        this.prisma.faq.count(),
      ]);

    return {
      totalUsers,
      subscriptions: { FREE: freeUsers, PRO: proUsers, PRO_MAX: proMaxUsers },
      activeChats,
      totalFaqs,
    };
  }

  // ─── User Management ──────────────────────────────────────────────

  @Get('users')
  async getUsers(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(parseInt(limit ?? '20', 10), 100);
    const skip = (Math.max(parseInt(page ?? '1', 10), 1) - 1) * take;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subscription: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page: Math.floor(skip / take) + 1, totalPages: Math.ceil(total / take) };
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() data: { role?: string; subscription?: string },
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.role && { role: data.role as 'USER' | 'ADMIN' }),
        ...(data.subscription && { subscription: data.subscription as 'FREE' | 'PRO' | 'PRO_MAX' }),
      },
      select: { id: true, email: true, name: true, role: true, subscription: true },
    });
  }

  // ─── FAQ Management ───────────────────────────────────────────────

  @Get('faq')
  async getFaqs() {
    return this.prisma.faq.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Post('faq')
  async createFaq(@Body() data: { question: string; answer: string; category?: string }) {
    return this.prisma.faq.create({ data });
  }

  @Patch('faq/:id')
  async updateFaq(
    @Param('id') id: string,
    @Body() data: { question?: string; answer?: string; category?: string },
  ) {
    return this.prisma.faq.update({ where: { id }, data });
  }

  @Delete('faq/:id')
  async deleteFaq(@Param('id') id: string) {
    return this.prisma.faq.delete({ where: { id } });
  }

  // ─── Chat Management ──────────────────────────────────────────────

  @Get('chats')
  async getChats() {
    return this.prisma.chat.findMany({
      where: { status: { not: 'CLOSED' } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Get('chats/:id')
  async getChatDetail(@Param('id') id: string) {
    return this.prisma.chat.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  @Post('chats/:id/message')
  async adminReply(
    @Param('id') chatId: string,
    @CurrentUser() admin: { userId: string },
    @Body() body: { message: string },
  ) {
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { status: 'HUMAN' },
    });

    const msg = await this.prisma.chatMessage.create({
      data: {
        chatId,
        senderId: admin.userId,
        senderRole: 'ADMIN',
        body: body.message,
      },
    });

    await this.pusher.trigger(`chat-${chatId}`, 'new-message', msg);

    return msg;
  }

  @Post('chats/:id/close')
  async closeChat(@Param('id') id: string) {
    const chat = await this.prisma.chat.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    // Notify the user's ChatWidget to reset
    await this.pusher.trigger(`chat-${id}`, 'chat-cleared', { reason: 'closed' });

    return chat;
  }

  @Delete('chats/:id/clear')
  async clearChat(@Param('id') id: string) {
    // Delete all messages in this chat
    await this.prisma.chatMessage.deleteMany({ where: { chatId: id } });

    // Reset chat status back to BOT
    const chat = await this.prisma.chat.update({
      where: { id },
      data: { status: 'BOT' },
    });

    // Notify the user's ChatWidget to reset
    await this.pusher.trigger(`chat-${id}`, 'chat-cleared', { reason: 'cleared' });

    return chat;
  }
}
