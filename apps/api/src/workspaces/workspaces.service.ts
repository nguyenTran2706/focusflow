import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWorkspaceDto, InviteToWorkspaceDto } from './dto/index.js';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateWorkspaceDto, userId: string) {
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
    const isMember = workspace.memberships.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    return workspace;
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
}
