import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteToWorkspaceDto } from './dto/index.js';

const TIER_LIMITS = {
  FREE: { workspaces: 3, boardsPerWorkspace: 3, scrum: false, aiChat: false },
  PRO: { workspaces: 10, boardsPerWorkspace: 999, scrum: true, aiChat: true },
  PRO_MAX: { workspaces: 999, boardsPerWorkspace: 999, scrum: true, aiChat: true },
} as const;

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserTier(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return user.subscription as keyof typeof TIER_LIMITS;
  }

  async getLimits(userId: string) {
    const tier = await this.getUserTier(userId);
    const limits = TIER_LIMITS[tier];
    const workspaceCount = await this.prisma.membership.count({ where: { userId } });
    return { tier, limits, usage: { workspaces: workspaceCount } };
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateWorkspaceDto, userId: string) {
    const tier = await this.getUserTier(userId);
    const limits = TIER_LIMITS[tier];
    const workspaceCount = await this.prisma.membership.count({ where: { userId } });
    if (workspaceCount >= limits.workspaces) {
      throw new ForbiddenException(
        `Your ${tier} plan allows up to ${limits.workspaces} workspaces. Upgrade to create more.`,
      );
    }

    const slugTaken = await this.prisma.workspace.findUnique({
      where: { slug: dto.slug },
    });
    if (slugTaken) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        memberships: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: { memberships: true },
    });
  }

  // ── List workspaces for current user ──────────────────────────────────────

  async listForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        memberships: { some: { userId } },
      },
      include: {
        memberships: {
          select: { role: true, userId: true },
        },
        _count: { select: { boards: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Get single workspace (with membership check) ─────────────────────────

  async findOneOrFail(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        memberships: { select: { userId: true, role: true } },
        _count: { select: { boards: true, memberships: true } },
      },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    const isMember = workspace.memberships.some((m: any) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    return workspace;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(workspaceId: string, dto: UpdateWorkspaceDto, userId: string) {
    const workspace = await this.findOneOrFail(workspaceId, userId);
    // Only OWNER or ADMIN can update
    const membership = workspace.memberships.find((m: any) => m.userId === userId);
    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException('Only admins or owners can update workspaces');
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async delete(workspaceId: string, userId: string) {
    const workspace = await this.findOneOrFail(workspaceId, userId);
    // Only OWNER can delete
    const membership = workspace.memberships.find((m: any) => m.userId === userId);
    if (!membership || membership.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can delete a workspace');
    }

    return this.prisma.workspace.delete({ where: { id: workspaceId } });
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async listMembers(workspaceId: string, userId: string) {
    await this.findOneOrFail(workspaceId, userId);
    const memberships = await this.prisma.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m: any) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }));
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  async getSummary(workspaceId: string, userId: string) {
    await this.findOneOrFail(workspaceId, userId);

    const boards = await this.prisma.board.findMany({
      where: { workspaceId },
      include: {
        columns: {
          include: {
            cards: {
              include: {
                author: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const allCards = boards.flatMap((b: any) =>
      b.columns.flatMap((col: any) =>
        col.cards.map((card: any) => ({ ...card, columnName: col.name })),
      ),
    );

    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0, none: 0 };
    const typeCounts: Record<string, number> = {};
    let completedRecently = 0;
    let updatedRecently = 0;
    let createdRecently = 0;
    let dueSoon = 0;

    for (const card of allCards) {
      const colLower = card.columnName.toLowerCase().trim();
      statusCounts[card.columnName] = (statusCounts[card.columnName] ?? 0) + 1;

      if (card.priority && card.priority in priorityCounts) {
        priorityCounts[card.priority]++;
      } else {
        priorityCounts['none']++;
      }

      const t = card.type ?? 'task';
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;

      const isDone = colLower === 'done' || colLower === 'complete' || colLower === 'completed';
      if (isDone && card.updatedAt >= sevenDaysAgo) completedRecently++;
      if (card.updatedAt >= sevenDaysAgo) updatedRecently++;
      if (card.createdAt >= sevenDaysAgo) createdRecently++;
      if (card.dueDate && card.dueDate <= sevenDaysFromNow && card.dueDate >= now && !isDone) dueSoon++;
    }

    const recentActivity = allCards
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
      .map((c: any) => ({
        cardId: c.id,
        title: c.title,
        columnName: c.columnName,
        author: c.author,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      }));

    return {
      totalCards: allCards.length,
      completedRecently,
      updatedRecently,
      createdRecently,
      dueSoon,
      statusCounts,
      priorityCounts,
      typeCounts,
      recentActivity,
    };
  }

  // ── Invite ────────────────────────────────────────────────────────────────

  async invite(
    workspaceId: string,
    dto: InviteToWorkspaceDto,
    invitedById: string,
  ) {
    // Verify inviter is at least ADMIN
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId: invitedById, workspaceId },
      },
    });
    if (!membership || membership.role === 'MEMBER') {
      throw new ForbiddenException(
        'You must be an admin or owner to invite members',
      );
    }

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      const alreadyMember = await this.prisma.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: existingUser.id,
            workspaceId,
          },
        },
      });
      if (alreadyMember) {
        throw new ConflictException('User is already a member');
      }
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.prisma.invite.create({
      data: {
        email: dto.email,
        token,
        workspaceId,
        role: dto.role ?? 'MEMBER',
        invitedById,
        expiresAt,
      },
    });
  }

  // ── Accept invite ─────────────────────────────────────────────────────────

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: { workspace: true },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.acceptedAt) throw new ConflictException('Invite already accepted');
    if (invite.expiresAt < new Date()) throw new ForbiddenException('Invite has expired');

    // Verify the accepting user's email matches the invite
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.email !== invite.email) {
      throw new ForbiddenException('This invite was sent to a different email address');
    }

    // Check if already a member
    const existing = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
    });
    if (existing) throw new ConflictException('Already a member of this workspace');

    // Create membership and mark invite as accepted
    await this.prisma.membership.create({
      data: {
        userId,
        workspaceId: invite.workspaceId,
        role: invite.role,
      },
    });

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return { workspaceId: invite.workspaceId, workspaceName: invite.workspace.name };
  }
}
