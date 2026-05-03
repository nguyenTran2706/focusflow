import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateBoardDto,
  UpdateBoardDto,
  CreateColumnDto,
  UpdateColumnDto,
  MoveColumnDto,
  CreateCardDto,
  UpdateCardDto,
  MoveCardDto,
  CreateCommentDto,
  UpdateCommentDto,
  InviteBoardCollaboratorsDto,
  UpdateBoardCollaboratorDto,
  UpdateBoardLinkAccessDto,
} from './dto/index.js';

import { PusherService } from '../pusher/pusher.service.js';
import { EmailService } from '../email/email.service.js';

const TIER_LIMITS = {
  FREE: { boardsPerWorkspace: 3, scrum: false },
  PRO: { boardsPerWorkspace: 999, scrum: true },
  PRO_MAX: { boardsPerWorkspace: 999, scrum: true },
} as const;

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type AccessLevel = 'NONE' | 'VIEW' | 'EDIT' | 'MANAGE';

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pusher: PusherService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ── Access ────────────────────────────────────────────────────────────────

  private async resolveBoardAccess(
    boardId: string,
    userId: string,
  ): Promise<{ level: AccessLevel; board: { id: string; workspaceId: string } }> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, workspaceId: true },
    });
    if (!board) throw new NotFoundException('Board not found');

    const member = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: board.workspaceId } },
    });
    if (member) return { level: 'MANAGE', board };

    const collab = await this.prisma.boardCollaborator.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (collab) return { level: collab.role === 'EDITOR' ? 'EDIT' : 'VIEW', board };

    return { level: 'NONE', board };
  }

  private async assertBoardView(boardId: string, userId: string) {
    const acc = await this.resolveBoardAccess(boardId, userId);
    if (acc.level === 'NONE') throw new ForbiddenException('No access to this board');
    return acc;
  }

  private async assertBoardEdit(boardId: string, userId: string) {
    const acc = await this.resolveBoardAccess(boardId, userId);
    if (acc.level === 'NONE' || acc.level === 'VIEW')
      throw new ForbiddenException('Edit access required');
    return acc;
  }

  private async assertBoardManage(boardId: string, userId: string) {
    const acc = await this.resolveBoardAccess(boardId, userId);
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

  private async getUserTier(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return user.subscription as keyof typeof TIER_LIMITS;
  }

  // ── Boards ────────────────────────────────────────────────────────────────

  async createBoard(workspaceId: string, dto: CreateBoardDto, userId: string) {
    await this.assertMember(workspaceId, userId);

    const tier = await this.getUserTier(userId);
    const limits = TIER_LIMITS[tier];
    const boardCount = await this.prisma.board.count({ where: { workspaceId } });
    if (boardCount >= limits.boardsPerWorkspace) {
      throw new ForbiddenException(
        `Your ${tier} plan allows up to ${limits.boardsPerWorkspace} boards per workspace. Upgrade to create more.`,
      );
    }

    return this.prisma.board.create({
      data: {
        workspaceId,
        name: dto.name,
        columns: {
          create: [
            { name: 'To Do', rank: '0' },
            { name: 'In Progress', rank: '1' },
            { name: 'Done', rank: '2' },
          ],
        },
      },
      include: { columns: { include: { cards: true }, orderBy: { rank: 'asc' } } },
    });
  }

  async listBoards(workspaceId: string, userId: string) {
    await this.assertMember(workspaceId, userId);
    return this.prisma.board.findMany({
      where: { workspaceId },
      include: { _count: { select: { columns: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBoard(boardId: string, userId: string) {
    await this.assertBoardView(boardId, userId);
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { rank: 'asc' },
          include: {
            cards: {
              orderBy: { rank: 'asc' },
              include: {
                author: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
                _count: { select: { comments: true } },
              },
            },
          },
        },
      },
    });
    if (!board) throw new NotFoundException('Board not found');
    return board;
  }

  async updateBoard(boardId: string, dto: UpdateBoardDto, userId: string) {
    await this.assertBoardEdit(boardId, userId);
    return this.prisma.board.update({
      where: { id: boardId },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
    });
  }

  async deleteBoard(boardId: string, userId: string) {
    await this.assertBoardManage(boardId, userId);
    return this.prisma.board.delete({ where: { id: boardId } });
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  async createColumn(boardId: string, dto: CreateColumnDto, userId: string, socketId?: string) {
    await this.assertBoardEdit(boardId, userId);

    const lastColumn = await this.prisma.boardColumn.findFirst({
      where: { boardId },
      orderBy: { rank: 'desc' },
      select: { rank: true },
    });
    const rank = lastColumn ? String(Number(lastColumn.rank) + 1) : '0';

    const column = await this.prisma.boardColumn.create({
      data: { boardId, name: dto.name, rank },
      include: { cards: true },
    });

    await this.pusher.trigger(`private-board-${boardId}`, 'board.updated', column, socketId);
    return column;
  }

  async updateColumn(columnId: string, dto: UpdateColumnDto, userId: string, socketId?: string) {
    const column = await this.prisma.boardColumn.findUniqueOrThrow({
      where: { id: columnId },
      include: { board: true },
    });
    await this.assertBoardEdit(column.boardId, userId);

    const updated = await this.prisma.boardColumn.update({
      where: { id: columnId },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
      include: { cards: true },
    });

    await this.pusher.trigger(`private-board-${column.boardId}`, 'board.updated', updated, socketId);
    return updated;
  }

  async deleteColumn(columnId: string, userId: string, socketId?: string) {
    const column = await this.prisma.boardColumn.findUniqueOrThrow({
      where: { id: columnId },
      include: { board: true },
    });
    await this.assertBoardEdit(column.boardId, userId);

    const deleted = await this.prisma.boardColumn.delete({ where: { id: columnId } });
    await this.pusher.trigger(`private-board-${column.boardId}`, 'board.updated', { deletedColumnId: columnId }, socketId);
    return deleted;
  }

  async moveColumn(columnId: string, dto: MoveColumnDto, userId: string, socketId?: string) {
    const column = await this.prisma.boardColumn.findUniqueOrThrow({
      where: { id: columnId },
      include: { board: true },
    });
    await this.assertBoardEdit(column.boardId, userId);

    const updated = await this.prisma.boardColumn.update({
      where: { id: columnId },
      data: { rank: dto.rank },
    });

    await this.pusher.trigger(`private-board-${column.boardId}`, 'board.updated', updated, socketId);
    return updated;
  }

  // ── Cards ─────────────────────────────────────────────────────────────────

  async createCard(columnId: string, dto: CreateCardDto, userId: string, socketId?: string) {
    const column = await this.prisma.boardColumn.findUniqueOrThrow({
      where: { id: columnId },
      include: { board: true },
    });
    await this.assertBoardEdit(column.boardId, userId);

    const lastCard = await this.prisma.card.findFirst({
      where: { columnId },
      orderBy: { rank: 'desc' },
      select: { rank: true },
    });
    const rank = lastCard ? String(Number(lastCard.rank) + 1) : '0';

    const card = await this.prisma.card.create({
      data: {
        columnId,
        authorId: userId,
        title: dto.title,
        body: dto.body,
        type: dto.type ?? 'task',
        priority: dto.priority,
        labels: dto.labels ?? [],
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        rank,
      },
      include: {
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    await this.pusher.trigger(`private-board-${column.boardId}`, 'board.updated', card, socketId);
    return card;
  }

  async getCard(cardId: string, userId: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: {
        column: { include: { board: true } },
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        },
        _count: { select: { comments: true } },
      },
    });
    await this.assertBoardView(card.column.boardId, userId);
    return card;
  }

  async updateCard(cardId: string, dto: UpdateCardDto, userId: string, socketId?: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertBoardEdit(card.column.boardId, userId);

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.labels !== undefined && { labels: dto.labels }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId || null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.sprintId !== undefined && { sprintId: dto.sprintId || null }),
        ...(dto.storyPoints !== undefined && { storyPoints: dto.storyPoints }),
      },
      include: {
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    });

    await this.pusher.trigger(`private-board-${card.column.boardId}`, 'board.updated', updated, socketId);
    return updated;
  }

  async moveCard(cardId: string, dto: MoveCardDto, userId: string, socketId?: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertBoardEdit(card.column.boardId, userId);

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: { columnId: dto.targetColumnId, rank: dto.rank },
    });

    await this.pusher.trigger(`private-board-${card.column.boardId}`, 'board.updated', updated, socketId);
    return updated;
  }

  async deleteCard(cardId: string, userId: string, socketId?: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertBoardEdit(card.column.boardId, userId);

    const deleted = await this.prisma.card.delete({ where: { id: cardId } });
    await this.pusher.trigger(`private-board-${card.column.boardId}`, 'board.updated', { deletedCardId: cardId }, socketId);
    return deleted;
  }

  async duplicateCard(cardId: string, userId: string, socketId?: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertBoardEdit(card.column.boardId, userId);

    const newRank = String(Number(card.rank) + 1);

    const newCard = await this.prisma.card.create({
      data: {
        columnId: card.columnId,
        authorId: userId,
        title: `${card.title} (Copy)`,
        body: card.body,
        type: card.type,
        priority: card.priority,
        labels: card.labels,
        assigneeId: card.assigneeId,
        dueDate: card.dueDate,
        startDate: card.startDate,
        storyPoints: card.storyPoints,
        rank: newRank,
      },
      include: {
        author: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    await this.pusher.trigger(`private-board-${card.column.boardId}`, 'board.updated', newCard, socketId);
    return newCard;
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async listComments(cardId: string, userId: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertBoardView(card.column.boardId, userId);

    return this.prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async createComment(cardId: string, dto: CreateCommentDto, userId: string) {
    const card = await this.prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    await this.assertBoardEdit(card.column.boardId, userId);

    return this.prisma.comment.create({
      data: { cardId, authorId: userId, body: dto.body },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async updateComment(commentId: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.prisma.comment.findUniqueOrThrow({
      where: { id: commentId },
      include: { card: { include: { column: { include: { board: true } } } } },
    });
    await this.assertBoardView(comment.card.column.boardId, userId);

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { body: dto.body },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUniqueOrThrow({
      where: { id: commentId },
      include: { card: { include: { column: { include: { board: true } } } } },
    });
    await this.assertBoardView(comment.card.column.boardId, userId);

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.comment.delete({ where: { id: commentId } });
  }

  // ── Sharing ───────────────────────────────────────────────────────────────

  async getShareInfo(boardId: string, userId: string) {
    await this.assertBoardView(boardId, userId);

    const board = await this.prisma.board.findUniqueOrThrow({
      where: { id: boardId },
      include: {
        collaborators: true,
        invitations: { where: { acceptedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });

    const userIds = board.collaborators.map((c: any) => c.userId);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, imageUrl: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      id: board.id,
      name: board.name,
      linkAccess: board.linkAccess,
      linkToken: board.linkToken,
      collaborators: board.collaborators.map((c: any) => ({
        userId: c.userId,
        role: c.role,
        addedById: c.addedById,
        createdAt: c.createdAt,
        user: userMap.get(c.userId) ?? null,
      })),
      invitations: board.invitations.map((i: any) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        token: i.token,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
    };
  }

  async inviteCollaborators(boardId: string, dto: InviteBoardCollaboratorsDto, userId: string) {
    await this.assertBoardManage(boardId, userId);

    const board = await this.prisma.board.findUniqueOrThrow({ where: { id: boardId } });
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

        const existingCollab = await this.prisma.boardCollaborator.findUnique({
          where: { boardId_userId: { boardId, userId: existing.id } },
        });
        if (existingCollab) {
          results.push({ email, status: 'already' });
          continue;
        }

        await this.prisma.boardCollaborator.create({
          data: { boardId, userId: existing.id, role: dto.role, addedById: userId },
        });

        const acceptUrl = `${webUrl}/boards/${boardId}`;
        await this.email.sendShareInvitation({
          to: email,
          inviterName: inviter.name,
          resourceType: 'board',
          resourceName: board.name,
          role: dto.role,
          acceptUrl,
        });
        results.push({ email, status: 'collaborator' });
      } else {
        const existingInvite = await this.prisma.boardInvitation.findFirst({
          where: { boardId, email, acceptedAt: null },
        });
        let token: string;
        if (existingInvite) {
          token = existingInvite.token;
          await this.prisma.boardInvitation.update({
            where: { id: existingInvite.id },
            data: { role: dto.role, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
          });
        } else {
          const created = await this.prisma.boardInvitation.create({
            data: {
              boardId,
              email,
              role: dto.role,
              invitedById: userId,
              expiresAt: new Date(Date.now() + INVITE_TTL_MS),
            },
          });
          token = created.token;
        }

        const acceptUrl = `${webUrl}/invite/board/${token}`;
        await this.email.sendShareInvitation({
          to: email,
          inviterName: inviter.name,
          resourceType: 'board',
          resourceName: board.name,
          role: dto.role,
          acceptUrl,
        });
        results.push({ email, status: 'invited' });
      }
    }

    return { results };
  }

  async updateCollaborator(boardId: string, collabUserId: string, dto: UpdateBoardCollaboratorDto, userId: string) {
    await this.assertBoardManage(boardId, userId);
    return this.prisma.boardCollaborator.update({
      where: { boardId_userId: { boardId, userId: collabUserId } },
      data: { role: dto.role },
    });
  }

  async removeCollaborator(boardId: string, collabUserId: string, userId: string) {
    await this.assertBoardManage(boardId, userId);
    await this.prisma.boardCollaborator.delete({
      where: { boardId_userId: { boardId, userId: collabUserId } },
    });
    return { removed: true };
  }

  async revokeInvitation(boardId: string, invitationId: string, userId: string) {
    await this.assertBoardManage(boardId, userId);
    await this.prisma.boardInvitation.delete({ where: { id: invitationId } });
    return { revoked: true };
  }

  async updateLinkAccess(boardId: string, dto: UpdateBoardLinkAccessDto, userId: string) {
    await this.assertBoardManage(boardId, userId);
    return this.prisma.board.update({
      where: { id: boardId },
      data: { linkAccess: dto.access },
      select: { id: true, linkAccess: true, linkToken: true },
    });
  }

  async joinByLink(token: string, userId: string) {
    const board = await this.prisma.board.findUnique({ where: { linkToken: token } });
    if (!board) throw new NotFoundException('Invalid link');
    if (board.linkAccess === 'NONE') throw new ForbiddenException('Link sharing is disabled');

    const member = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: board.workspaceId } },
    });
    if (member) return { boardId: board.id };

    const role = board.linkAccess === 'EDIT' ? 'EDITOR' : 'VIEWER';
    const existing = await this.prisma.boardCollaborator.findUnique({
      where: { boardId_userId: { boardId: board.id, userId } },
    });
    if (!existing) {
      await this.prisma.boardCollaborator.create({
        data: { boardId: board.id, userId, role, addedById: userId },
      });
    } else if (role === 'EDITOR' && existing.role === 'VIEWER') {
      await this.prisma.boardCollaborator.update({
        where: { boardId_userId: { boardId: board.id, userId } },
        data: { role: 'EDITOR' },
      });
    }

    return { boardId: board.id };
  }

  async getInvitationByToken(token: string) {
    const inv = await this.prisma.boardInvitation.findUnique({
      where: { token },
      include: { board: { select: { id: true, name: true } } },
    });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.acceptedAt) throw new BadRequestException('Invitation already accepted');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Invitation expired');

    return {
      email: inv.email,
      role: inv.role,
      resourceType: 'board' as const,
      resourceName: inv.board.name,
      boardId: inv.board.id,
      expiresAt: inv.expiresAt,
    };
  }

  async acceptInvitationByToken(token: string, userId: string) {
    const inv = await this.prisma.boardInvitation.findUnique({
      where: { token },
      include: { board: true },
    });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.acceptedAt) throw new BadRequestException('Invitation already accepted');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Invitation expired');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email');
    }

    const existing = await this.prisma.boardCollaborator.findUnique({
      where: { boardId_userId: { boardId: inv.boardId, userId } },
    });
    if (!existing) {
      await this.prisma.boardCollaborator.create({
        data: { boardId: inv.boardId, userId, role: inv.role, addedById: inv.invitedById },
      });
    }

    await this.prisma.boardInvitation.update({
      where: { id: inv.id },
      data: { acceptedAt: new Date() },
    });

    return { boardId: inv.boardId };
  }
}
