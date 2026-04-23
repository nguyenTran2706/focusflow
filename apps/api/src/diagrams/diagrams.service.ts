import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PusherService } from '../pusher/pusher.service.js';
import {
  CreateDiagramDto,
  UpdateDiagramDto,
  BroadcastDiagramDto,
} from './dto/index.js';

const MAX_DATA_BYTES = 5 * 1024 * 1024;

const TIER_LIMITS = {
  FREE: 1,
  PRO: 10,
  PRO_MAX: Infinity,
} as const;

@Injectable()
export class DiagramsService {
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

  async listDiagrams(boardId: string, userId: string) {
    await this.getBoardWithAuth(boardId, userId);
    return this.prisma.diagram.findMany({
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

  async createDiagram(boardId: string, dto: CreateDiagramDto, userId: string) {
    await this.getBoardWithAuth(boardId, userId);

    const tier = await this.getUserTier(userId);
    const limit = TIER_LIMITS[tier];
    const count = await this.prisma.diagram.count({ where: { boardId } });
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${tier} plan allows up to ${limit} diagram(s) per board. Upgrade to create more.`,
      );
    }

    return this.prisma.diagram.create({
      data: {
        boardId,
        name: dto.name ?? 'Untitled Diagram',
        createdById: userId,
      },
    });
  }

  async getDiagram(id: string, userId: string) {
    const dg = await this.prisma.diagram.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!dg) throw new NotFoundException('Diagram not found');
    await this.assertMember(dg.board.workspaceId, userId);
    const { board: _, ...result } = dg;
    return result;
  }

  async updateDiagram(id: string, dto: UpdateDiagramDto, userId: string, socketId?: string) {
    const dg = await this.prisma.diagram.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!dg) throw new NotFoundException('Diagram not found');
    await this.assertMember(dg.board.workspaceId, userId);

    if (dto.data !== undefined) {
      const size = Buffer.byteLength(JSON.stringify(dto.data), 'utf8');
      if (size > MAX_DATA_BYTES) {
        throw new PayloadTooLargeException(
          `Diagram data exceeds the ${MAX_DATA_BYTES / 1024 / 1024}MB limit`,
        );
      }
    }

    const updated = await this.prisma.diagram.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.data !== undefined && { data: dto.data }),
      },
    });

    await this.pusher.trigger(`private-board-${dg.boardId}`, 'diagram.updated', updated, socketId);

    return updated;
  }

  async deleteDiagram(id: string, userId: string) {
    const dg = await this.prisma.diagram.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!dg) throw new NotFoundException('Diagram not found');
    await this.assertMember(dg.board.workspaceId, userId);

    return this.prisma.diagram.delete({ where: { id } });
  }

  async broadcast(id: string, dto: BroadcastDiagramDto, userId: string) {
    const dg = await this.prisma.diagram.findUnique({
      where: { id },
      include: { board: true },
    });
    if (!dg) throw new NotFoundException('Diagram not found');
    await this.assertMember(dg.board.workspaceId, userId);

    await this.pusher.trigger(`private-diagram-${id}`, 'data-update', {
      nodes: dto.nodes,
      edges: dto.edges,
      viewport: dto.viewport,
      clientId: dto.clientId,
    });

    return { sent: true };
  }
}
