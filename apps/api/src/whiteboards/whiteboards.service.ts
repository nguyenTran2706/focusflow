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
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  BroadcastWhiteboardDto,
  InviteCollaboratorsDto,
  UpdateCollaboratorDto,
  UpdateLinkAccessDto,
} from './dto/index.js';

const MAX_SCENE_BYTES = 5 * 1024 * 1024;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const TIER_LIMITS = {
  FREE: 1,
  PRO: 10,
  PRO_MAX: Infinity,
} as const;

type AccessLevel = 'NONE' | 'VIEW' | 'EDIT' | 'MANAGE';

@Injectable()
export class WhiteboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pusher: PusherService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ─── Access Resolution ────────────────────────────────────────────────────

  private async resolveAccess(whiteboardId: string, userId: string): Promise<{
    level: AccessLevel;
    whiteboard: Awaited<ReturnType<PrismaService['whiteboard']['findUnique']>> & { board: { workspaceId: string } };
  }> {
    const wb = await this.prisma.whiteboard.findUnique({
      where: { id: whiteboardId },
      include: { board: true },
    });
    if (!wb) throw new NotFoundException('Whiteboard not found');

    // Workspace membership = MANAGE
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: wb.board.workspaceId } },
    });
    if (membership) return { level: 'MANAGE', whiteboard: wb as never };

    // External collaborator
    const collab = await this.prisma.whiteboardCollaborator.findUnique({
      where: { whiteboardId_userId: { whiteboardId, userId } },
    });
    if (collab) {
      return { level: collab.role === 'EDITOR' ? 'EDIT' : 'VIEW', whiteboard: wb as never };
    }

    return { level: 'NONE', whiteboard: wb as never };
  }

  private async assertView(whiteboardId: string, userId: string) {
    const acc = await this.resolveAccess(whiteboardId, userId);
    if (acc.level === 'NONE') throw new ForbiddenException('No access to this whiteboard');
    return acc;
  }

  private async assertEdit(whiteboardId: string, userId: string) {
    const acc = await this.resolveAccess(whiteboardId, userId);
    if (acc.level === 'NONE' || acc.level === 'VIEW') {
      throw new ForbiddenException('Edit access required');
    }
    return acc;
  }

  private async assertCanManage(whiteboardId: string, userId: string) {
    const acc = await this.resolveAccess(whiteboardId, userId);
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

  // ─── CRUD ─────────────────────────────────────────────────────────────────

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
    const { whiteboard } = await this.assertView(id, userId);
    const { board: _, ...result } = whiteboard as never as { board: unknown } & Record<string, unknown>;
    return result;
  }

  async updateWhiteboard(id: string, dto: UpdateWhiteboardDto, userId: string, socketId?: string) {
    const { whiteboard } = await this.assertEdit(id, userId);

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

    await this.pusher.trigger(
      `private-board-${(whiteboard as { boardId: string }).boardId}`,
      'whiteboard.updated',
      updated,
      socketId,
    );

    return updated;
  }

  async deleteWhiteboard(id: string, userId: string) {
    await this.assertCanManage(id, userId);
    return this.prisma.whiteboard.delete({ where: { id } });
  }

  async broadcast(id: string, dto: BroadcastWhiteboardDto, userId: string) {
    await this.assertEdit(id, userId);

    await this.pusher.trigger(`private-whiteboard-${id}`, 'scene-update', {
      elements: dto.elements,
      appState: dto.appState,
      clientId: dto.clientId,
    });

    return { sent: true };
  }

  // ─── Sharing ──────────────────────────────────────────────────────────────

  async getShareInfo(id: string, userId: string) {
    await this.assertView(id, userId);

    const wb = await this.prisma.whiteboard.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        linkAccess: true,
        linkToken: true,
        collaborators: true,
        invitations: {
          where: { acceptedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const userIds = wb.collaborators.map((c) => c.userId);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, imageUrl: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      id: wb.id,
      name: wb.name,
      linkAccess: wb.linkAccess,
      linkToken: wb.linkToken,
      collaborators: wb.collaborators.map((c) => ({
        userId: c.userId,
        role: c.role,
        addedById: c.addedById,
        createdAt: c.createdAt,
        user: userMap.get(c.userId) ?? null,
      })),
      invitations: wb.invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        token: i.token,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
    };
  }

  async inviteCollaborators(id: string, dto: InviteCollaboratorsDto, userId: string) {
    await this.assertCanManage(id, userId);

    const wb = await this.prisma.whiteboard.findUniqueOrThrow({ where: { id } });
    const board = await this.prisma.board.findUniqueOrThrow({ where: { id: wb.boardId } });
    const inviter = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const webUrl = this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:5173';

    const results: Array<{ email: string; status: 'collaborator' | 'invited' | 'already' }> = [];

    for (const rawEmail of dto.emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) continue;

      const existing = await this.prisma.user.findUnique({ where: { email } });

      if (existing) {
        // Skip if already a workspace member (they have access already)
        const member = await this.prisma.membership.findUnique({
          where: { userId_workspaceId: { userId: existing.id, workspaceId: board.workspaceId } },
        });
        if (member) {
          results.push({ email, status: 'already' });
          continue;
        }

        const existingCollab = await this.prisma.whiteboardCollaborator.findUnique({
          where: { whiteboardId_userId: { whiteboardId: id, userId: existing.id } },
        });
        if (existingCollab) {
          results.push({ email, status: 'already' });
          continue;
        }

        await this.prisma.whiteboardCollaborator.create({
          data: {
            whiteboardId: id,
            userId: existing.id,
            role: dto.role,
            addedById: userId,
          },
        });

        const acceptUrl = `${webUrl}/boards/${(wb as { boardId: string }).boardId}/whiteboards/${id}`;
        await this.email.sendWhiteboardInvitation({
          to: email,
          inviterName: inviter.name,
          whiteboardName: wb.name,
          role: dto.role,
          acceptUrl,
        });
        results.push({ email, status: 'collaborator' });
      } else {
        // Pending invitation
        const existingInvite = await this.prisma.whiteboardInvitation.findFirst({
          where: { whiteboardId: id, email, acceptedAt: null },
        });
        let token: string;
        if (existingInvite) {
          token = existingInvite.token;
          await this.prisma.whiteboardInvitation.update({
            where: { id: existingInvite.id },
            data: { role: dto.role, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
          });
        } else {
          const created = await this.prisma.whiteboardInvitation.create({
            data: {
              whiteboardId: id,
              email,
              role: dto.role,
              invitedById: userId,
              expiresAt: new Date(Date.now() + INVITE_TTL_MS),
            },
          });
          token = created.token;
        }

        const acceptUrl = `${webUrl}/invite/whiteboard/${token}`;
        await this.email.sendWhiteboardInvitation({
          to: email,
          inviterName: inviter.name,
          whiteboardName: wb.name,
          role: dto.role,
          acceptUrl,
        });
        results.push({ email, status: 'invited' });
      }
    }

    return { results };
  }

  async updateCollaborator(id: string, collabUserId: string, dto: UpdateCollaboratorDto, userId: string) {
    await this.assertCanManage(id, userId);
    return this.prisma.whiteboardCollaborator.update({
      where: { whiteboardId_userId: { whiteboardId: id, userId: collabUserId } },
      data: { role: dto.role },
    });
  }

  async removeCollaborator(id: string, collabUserId: string, userId: string) {
    await this.assertCanManage(id, userId);
    await this.prisma.whiteboardCollaborator.delete({
      where: { whiteboardId_userId: { whiteboardId: id, userId: collabUserId } },
    });
    return { removed: true };
  }

  async revokeInvitation(id: string, invitationId: string, userId: string) {
    await this.assertCanManage(id, userId);
    await this.prisma.whiteboardInvitation.delete({ where: { id: invitationId } });
    return { revoked: true };
  }

  async updateLinkAccess(id: string, dto: UpdateLinkAccessDto, userId: string) {
    await this.assertCanManage(id, userId);
    return this.prisma.whiteboard.update({
      where: { id },
      data: { linkAccess: dto.access },
      select: { id: true, linkAccess: true, linkToken: true },
    });
  }

  async joinByLink(token: string, userId: string) {
    const wb = await this.prisma.whiteboard.findUnique({ where: { linkToken: token } });
    if (!wb) throw new NotFoundException('Invalid link');
    if (wb.linkAccess === 'NONE') throw new ForbiddenException('Link sharing is disabled');

    // Workspace member already has access
    const board = await this.prisma.board.findUniqueOrThrow({ where: { id: wb.boardId } });
    const member = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: board.workspaceId } },
    });
    if (member) {
      return { whiteboardId: wb.id, boardId: wb.boardId };
    }

    const role = wb.linkAccess === 'EDIT' ? 'EDITOR' : 'VIEWER';
    const existing = await this.prisma.whiteboardCollaborator.findUnique({
      where: { whiteboardId_userId: { whiteboardId: wb.id, userId } },
    });
    if (!existing) {
      await this.prisma.whiteboardCollaborator.create({
        data: {
          whiteboardId: wb.id,
          userId,
          role,
          addedById: userId,
        },
      });
    } else if (role === 'EDITOR' && existing.role === 'VIEWER') {
      // Upgrade viewer → editor if link grants edit
      await this.prisma.whiteboardCollaborator.update({
        where: { whiteboardId_userId: { whiteboardId: wb.id, userId } },
        data: { role: 'EDITOR' },
      });
    }

    return { whiteboardId: wb.id, boardId: wb.boardId };
  }

  async getInvitationByToken(token: string) {
    const inv = await this.prisma.whiteboardInvitation.findUnique({
      where: { token },
      include: { whiteboard: { select: { id: true, name: true, boardId: true } } },
    });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.acceptedAt) throw new BadRequestException('Invitation already accepted');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Invitation expired');

    return {
      email: inv.email,
      role: inv.role,
      whiteboardName: inv.whiteboard.name,
      whiteboardId: inv.whiteboard.id,
      boardId: inv.whiteboard.boardId,
      expiresAt: inv.expiresAt,
    };
  }

  async acceptInvitationByToken(token: string, userId: string) {
    const inv = await this.prisma.whiteboardInvitation.findUnique({
      where: { token },
      include: { whiteboard: true },
    });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.acceptedAt) throw new BadRequestException('Invitation already accepted');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Invitation expired');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email');
    }

    const existing = await this.prisma.whiteboardCollaborator.findUnique({
      where: { whiteboardId_userId: { whiteboardId: inv.whiteboardId, userId } },
    });
    if (!existing) {
      await this.prisma.whiteboardCollaborator.create({
        data: {
          whiteboardId: inv.whiteboardId,
          userId,
          role: inv.role,
          addedById: inv.invitedById,
        },
      });
    }

    await this.prisma.whiteboardInvitation.update({
      where: { id: inv.id },
      data: { acceptedAt: new Date() },
    });

    return {
      whiteboardId: inv.whiteboardId,
      boardId: inv.whiteboard.boardId,
    };
  }
}
