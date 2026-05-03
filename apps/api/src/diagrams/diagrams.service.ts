import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { PusherService } from '../pusher/pusher.service.js';
import { EmailService } from '../email/email.service.js';
import {
  CreateDiagramDto,
  UpdateDiagramDto,
  BroadcastDiagramDto,
  InviteDiagramCollaboratorsDto,
  UpdateDiagramCollaboratorDto,
  UpdateDiagramLinkAccessDto,
} from './dto/index.js';

const MAX_DATA_BYTES = 5 * 1024 * 1024;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const TIER_LIMITS = {
  FREE: 1,
  PRO: 10,
  PRO_MAX: Infinity,
} as const;

type AccessLevel = 'NONE' | 'VIEW' | 'EDIT' | 'MANAGE';

@Injectable()
export class DiagramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pusher: PusherService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ── Access ───────────────────────────────────────────────────────────────

  private async resolveAccess(diagramId: string, userId: string): Promise<{
    level: AccessLevel;
    diagram: any;
  }> {
    const dg = await this.prisma.diagram.findUnique({
      where: { id: diagramId },
      include: { board: true },
    });
    if (!dg) throw new NotFoundException('Diagram not found');

    const member = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: dg.board.workspaceId } },
    });
    if (member) return { level: 'MANAGE', diagram: dg };

    const collab = await this.prisma.diagramCollaborator.findUnique({
      where: { diagramId_userId: { diagramId, userId } },
    });
    if (collab) return { level: collab.role === 'EDITOR' ? 'EDIT' : 'VIEW', diagram: dg };

    return { level: 'NONE', diagram: dg };
  }

  private async assertView(id: string, userId: string) {
    const acc = await this.resolveAccess(id, userId);
    if (acc.level === 'NONE') throw new ForbiddenException('No access to this diagram');
    return acc;
  }

  private async assertEdit(id: string, userId: string) {
    const acc = await this.resolveAccess(id, userId);
    if (acc.level === 'NONE' || acc.level === 'VIEW')
      throw new ForbiddenException('Edit access required');
    return acc;
  }

  private async assertCanManage(id: string, userId: string) {
    const acc = await this.resolveAccess(id, userId);
    if (acc.level !== 'MANAGE') throw new ForbiddenException('Only workspace members can manage sharing');
    return acc;
  }

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

  // ── CRUD ─────────────────────────────────────────────────────────────────

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
    const { diagram } = await this.assertView(id, userId);
    const { board: _, ...result } = diagram;
    return result;
  }

  async updateDiagram(id: string, dto: UpdateDiagramDto, userId: string, socketId?: string) {
    const { diagram } = await this.assertEdit(id, userId);

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

    await this.pusher.trigger(`private-board-${diagram.boardId}`, 'diagram.updated', updated, socketId);
    return updated;
  }

  async deleteDiagram(id: string, userId: string) {
    await this.assertCanManage(id, userId);
    return this.prisma.diagram.delete({ where: { id } });
  }

  async broadcast(id: string, dto: BroadcastDiagramDto, userId: string) {
    await this.assertEdit(id, userId);

    await this.pusher.trigger(`private-diagram-${id}`, 'data-update', {
      nodes: dto.nodes,
      edges: dto.edges,
      viewport: dto.viewport,
      clientId: dto.clientId,
    });

    return { sent: true };
  }

  // ── Sharing ──────────────────────────────────────────────────────────────

  async getShareInfo(id: string, userId: string) {
    await this.assertView(id, userId);

    const dg = await this.prisma.diagram.findUniqueOrThrow({
      where: { id },
      include: {
        collaborators: true,
        invitations: { where: { acceptedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });

    const userIds = dg.collaborators.map((c: any) => c.userId);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, imageUrl: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      id: dg.id,
      name: dg.name,
      linkAccess: dg.linkAccess,
      linkToken: dg.linkToken,
      collaborators: dg.collaborators.map((c: any) => ({
        userId: c.userId,
        role: c.role,
        addedById: c.addedById,
        createdAt: c.createdAt,
        user: userMap.get(c.userId) ?? null,
      })),
      invitations: dg.invitations.map((i: any) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        token: i.token,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
    };
  }

  async inviteCollaborators(id: string, dto: InviteDiagramCollaboratorsDto, userId: string) {
    await this.assertCanManage(id, userId);

    const dg = await this.prisma.diagram.findUniqueOrThrow({ where: { id } });
    const board = await this.prisma.board.findUniqueOrThrow({ where: { id: dg.boardId } });
    const inviter = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const webUrl = this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:5173';

    const results: Array<{ email: string; status: 'collaborator' | 'invited' | 'already' }> = [];

    for (const rawEmail of dto.emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) continue;

      const existing = await this.prisma.user.findUnique({ where: { email } });

      if (existing) {
        const member = await this.prisma.membership.findUnique({
          where: { userId_workspaceId: { userId: existing.id, workspaceId: board.workspaceId } },
        });
        if (member) {
          results.push({ email, status: 'already' });
          continue;
        }

        const existingCollab = await this.prisma.diagramCollaborator.findUnique({
          where: { diagramId_userId: { diagramId: id, userId: existing.id } },
        });
        if (existingCollab) {
          results.push({ email, status: 'already' });
          continue;
        }

        await this.prisma.diagramCollaborator.create({
          data: { diagramId: id, userId: existing.id, role: dto.role, addedById: userId },
        });

        const acceptUrl = `${webUrl}/boards/${dg.boardId}/diagrams/${id}`;
        await this.email.sendShareInvitation({
          to: email,
          inviterName: inviter.name,
          resourceType: 'diagram',
          resourceName: dg.name,
          role: dto.role,
          acceptUrl,
        });
        results.push({ email, status: 'collaborator' });
      } else {
        const existingInvite = await this.prisma.diagramInvitation.findFirst({
          where: { diagramId: id, email, acceptedAt: null },
        });
        let token: string;
        if (existingInvite) {
          token = existingInvite.token;
          await this.prisma.diagramInvitation.update({
            where: { id: existingInvite.id },
            data: { role: dto.role, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
          });
        } else {
          const created = await this.prisma.diagramInvitation.create({
            data: {
              diagramId: id,
              email,
              role: dto.role,
              invitedById: userId,
              expiresAt: new Date(Date.now() + INVITE_TTL_MS),
            },
          });
          token = created.token;
        }

        const acceptUrl = `${webUrl}/invite/diagram/${token}`;
        await this.email.sendShareInvitation({
          to: email,
          inviterName: inviter.name,
          resourceType: 'diagram',
          resourceName: dg.name,
          role: dto.role,
          acceptUrl,
        });
        results.push({ email, status: 'invited' });
      }
    }

    return { results };
  }

  async updateCollaborator(id: string, collabUserId: string, dto: UpdateDiagramCollaboratorDto, userId: string) {
    await this.assertCanManage(id, userId);
    return this.prisma.diagramCollaborator.update({
      where: { diagramId_userId: { diagramId: id, userId: collabUserId } },
      data: { role: dto.role },
    });
  }

  async removeCollaborator(id: string, collabUserId: string, userId: string) {
    await this.assertCanManage(id, userId);
    await this.prisma.diagramCollaborator.delete({
      where: { diagramId_userId: { diagramId: id, userId: collabUserId } },
    });
    return { removed: true };
  }

  async revokeInvitation(id: string, invitationId: string, userId: string) {
    await this.assertCanManage(id, userId);
    await this.prisma.diagramInvitation.delete({ where: { id: invitationId } });
    return { revoked: true };
  }

  async updateLinkAccess(id: string, dto: UpdateDiagramLinkAccessDto, userId: string) {
    await this.assertCanManage(id, userId);
    return this.prisma.diagram.update({
      where: { id },
      data: { linkAccess: dto.access },
      select: { id: true, linkAccess: true, linkToken: true },
    });
  }

  async joinByLink(token: string, userId: string) {
    const dg = await this.prisma.diagram.findUnique({ where: { linkToken: token } });
    if (!dg) throw new NotFoundException('Invalid link');
    if (dg.linkAccess === 'NONE') throw new ForbiddenException('Link sharing is disabled');

    const board = await this.prisma.board.findUniqueOrThrow({ where: { id: dg.boardId } });
    const member = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: board.workspaceId } },
    });
    if (member) return { diagramId: dg.id, boardId: dg.boardId };

    const role = dg.linkAccess === 'EDIT' ? 'EDITOR' : 'VIEWER';
    const existing = await this.prisma.diagramCollaborator.findUnique({
      where: { diagramId_userId: { diagramId: dg.id, userId } },
    });
    if (!existing) {
      await this.prisma.diagramCollaborator.create({
        data: { diagramId: dg.id, userId, role, addedById: userId },
      });
    } else if (role === 'EDITOR' && existing.role === 'VIEWER') {
      await this.prisma.diagramCollaborator.update({
        where: { diagramId_userId: { diagramId: dg.id, userId } },
        data: { role: 'EDITOR' },
      });
    }

    return { diagramId: dg.id, boardId: dg.boardId };
  }

  async getInvitationByToken(token: string) {
    const inv = await this.prisma.diagramInvitation.findUnique({
      where: { token },
      include: { diagram: { select: { id: true, name: true, boardId: true } } },
    });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.acceptedAt) throw new BadRequestException('Invitation already accepted');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Invitation expired');

    return {
      email: inv.email,
      role: inv.role,
      resourceType: 'diagram' as const,
      resourceName: inv.diagram.name,
      diagramId: inv.diagram.id,
      boardId: inv.diagram.boardId,
      expiresAt: inv.expiresAt,
    };
  }

  async acceptInvitationByToken(token: string, userId: string) {
    const inv = await this.prisma.diagramInvitation.findUnique({
      where: { token },
      include: { diagram: true },
    });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.acceptedAt) throw new BadRequestException('Invitation already accepted');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Invitation expired');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email');
    }

    const existing = await this.prisma.diagramCollaborator.findUnique({
      where: { diagramId_userId: { diagramId: inv.diagramId, userId } },
    });
    if (!existing) {
      await this.prisma.diagramCollaborator.create({
        data: { diagramId: inv.diagramId, userId, role: inv.role, addedById: inv.invitedById },
      });
    }

    await this.prisma.diagramInvitation.update({
      where: { id: inv.id },
      data: { acceptedAt: new Date() },
    });

    return { diagramId: inv.diagramId, boardId: inv.diagram.boardId };
  }
}
