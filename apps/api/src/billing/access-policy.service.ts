import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Free-tier users keep this many most-recently-accessed workspaces unlocked
// after a downgrade. Older ones are soft-locked until they upgrade.
export const FREE_TIER_WORKSPACE_LIMIT = 3;

export const WORKSPACE_LOCKED_CODE = 'WORKSPACE_LOCKED_DOWNGRADE';

export interface AccessibleSet {
  // null = unlimited (PRO / PRO_MAX)
  ids: Set<string> | null;
  tier: 'FREE' | 'PRO' | 'PRO_MAX';
  capped: boolean;
}

@Injectable()
export class AccessPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccessibleWorkspaceIds(userId: string): Promise<AccessibleSet> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { subscription: true },
    });
    const tier = user.subscription as AccessibleSet['tier'];

    if (tier !== 'FREE') {
      return { ids: null, tier, capped: false };
    }

    const recent = await this.prisma.membership.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: 'desc' },
      take: FREE_TIER_WORKSPACE_LIMIT,
      select: { workspaceId: true },
    });

    return {
      ids: new Set(recent.map((r) => r.workspaceId)),
      tier,
      capped: true,
    };
  }

  async assertWorkspaceAccessible(userId: string, workspaceId: string): Promise<void> {
    const { ids, capped } = await this.getAccessibleWorkspaceIds(userId);
    if (capped && ids && !ids.has(workspaceId)) {
      throw new ForbiddenException({
        code: WORKSPACE_LOCKED_CODE,
        message:
          'This workspace is locked because your plan no longer covers it. Upgrade to Pro to unlock.',
      });
    }
  }

  async stampWorkspaceAccess(userId: string, workspaceId: string): Promise<void> {
    await this.prisma.membership.update({
      where: { userId_workspaceId: { userId, workspaceId } },
      data: { lastAccessedAt: new Date() },
    });
  }

  async stampBoardAccess(boardId: string): Promise<void> {
    await this.prisma.board.update({
      where: { id: boardId },
      data: { lastAccessedAt: new Date() },
    });
  }
}
