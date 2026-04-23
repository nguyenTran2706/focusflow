import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PusherService } from '../pusher/pusher.service.js';
import {
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  BroadcastWhiteboardDto,
} from './dto/index.js';

const MAX_SCENE_BYTES = 5 * 1024 * 1024;

const TIER_LIMITS = {
  FREE: 1,
  PRO: 10,
  PRO_MAX: Infinity,
} as const;

@Injectable()
export class WhiteboardsService {
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

  private async getBoardWithAuth(boardId: string, userId: string) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    await this.assertMember(board.workspaceId, userId);
    return board;
  }

  private async getUserTier(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return user.subscription as keyof typeof TIER_LIMITS;
  }

  async listWhiteboards(boardId: string, userId: string) {
    await this.getBoardWithAuth(boardId, userId);
    return this.prisma.whiteboard.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        boardId: true,
        name: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createWhiteboard(boardId: string, dto: CreateWhiteboardDto, userId: string) {
    await this.getBoardWithAuth(boardId, userId);

    const tier = await this.getUserTier(userId);
    const limit = TIER_LIMITS[tier];
    const count = await this.prisma.whiteboard.count({ where: { boardId } });
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${tier} plan allows up to ${limit} whiteboard(s) per board. Upgrade to create more.`,
      );
    }

    return this.prisma.whiteboard.create({
      data: {
        boardId,
        name: dto.name ?? 'Untitled Whiteboard',
        createdById: userId,
      },
    });
  }

  async getWhiteboard(id: string, userId: string) {
    const wb = await this.prisma.whiteboard.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!wb) throw new NotFoundException('Whiteboard not found');
    await this.assertMember(wb.board.workspaceId, userId);
    const { board: _, ...result } = wb;
    return result;
  }

  async updateWhiteboard(id: string, dto: UpdateWhiteboardDto, userId: string, socketId?: string) {
    const wb = await this.prisma.whiteboard.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!wb) throw new NotFoundException('Whiteboard not found');
    await this.assertMember(wb.board.workspaceId, userId);

    if (dto.scene !== undefined) {
      const size = Buffer.byteLength(JSON.stringify(dto.scene), 'utf8');
      if (size > MAX_SCENE_BYTES) {
        throw new PayloadTooLargeException(
          `Scene data exceeds the ${MAX_SCENE_BYTES / 1024 / 1024}MB limit`,
        );
      }
    }

    const updated = await this.prisma.whiteboard.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.scene !== undefined && { scene: dto.scene }),
      },
    });

    await this.pusher.trigger(`private-board-${wb.boardId}`, 'whiteboard.updated', updated, socketId);

    return updated;
  }

  async deleteWhiteboard(id: string, userId: string) {
    const wb = await this.prisma.whiteboard.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!wb) throw new NotFoundException('Whiteboard not found');
    await this.assertMember(wb.board.workspaceId, userId);

    return this.prisma.whiteboard.delete({ where: { id } });
  }

  async broadcast(id: string, dto: BroadcastWhiteboardDto, userId: string) {
    const wb = await this.prisma.whiteboard.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!wb) throw new NotFoundException('Whiteboard not found');
    await this.assertMember(wb.board.workspaceId, userId);

    await this.pusher.trigger(`private-whiteboard-${id}`, 'scene-update', {
      elements: dto.elements,
      appState: dto.appState,
      clientId: dto.clientId,
    });

    return { sent: true };
  }
}
