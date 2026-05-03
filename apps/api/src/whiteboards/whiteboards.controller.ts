import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { WhiteboardsService } from './whiteboards.service.js';
import {
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  BroadcastWhiteboardDto,
  InviteCollaboratorsDto,
  UpdateCollaboratorDto,
  UpdateLinkAccessDto,
} from './dto/index.js';

@UseGuards(ClerkAuthGuard)
@Controller()
export class WhiteboardsController {
  constructor(private readonly whiteboards: WhiteboardsService) {}

  @Get('boards/:boardId/whiteboards')
  list(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.listWhiteboards(boardId, user.userId);
  }

  @Post('boards/:boardId/whiteboards')
  create(
    @Param('boardId') boardId: string,
    @Body() dto: CreateWhiteboardDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.createWhiteboard(boardId, dto, user.userId);
  }

  @Get('whiteboards/:id')
  get(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.getWhiteboard(id, user.userId);
  }

  @Patch('whiteboards/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWhiteboardDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.whiteboards.updateWhiteboard(id, dto, user.userId, socketId);
  }

  @Delete('whiteboards/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.deleteWhiteboard(id, user.userId);
  }

  @Post('whiteboards/:id/broadcast')
  broadcast(
    @Param('id') id: string,
    @Body() dto: BroadcastWhiteboardDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.broadcast(id, dto, user.userId);
  }

  // ─── Sharing ──────────────────────────────────────────────────────────

  @Get('whiteboards/:id/share')
  getShare(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.getShareInfo(id, user.userId);
  }

  @Post('whiteboards/:id/invitations')
  invite(
    @Param('id') id: string,
    @Body() dto: InviteCollaboratorsDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.inviteCollaborators(id, dto, user.userId);
  }

  @Patch('whiteboards/:id/collaborators/:userId')
  updateCollab(
    @Param('id') id: string,
    @Param('userId') collabUserId: string,
    @Body() dto: UpdateCollaboratorDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.updateCollaborator(id, collabUserId, dto, user.userId);
  }

  @Delete('whiteboards/:id/collaborators/:userId')
  removeCollab(
    @Param('id') id: string,
    @Param('userId') collabUserId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.removeCollaborator(id, collabUserId, user.userId);
  }

  @Delete('whiteboards/:id/invitations/:invitationId')
  revokeInvite(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.revokeInvitation(id, invitationId, user.userId);
  }

  @Patch('whiteboards/:id/link-access')
  updateLinkAccess(
    @Param('id') id: string,
    @Body() dto: UpdateLinkAccessDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.updateLinkAccess(id, dto, user.userId);
  }

  @Post('whiteboards/by-link/:token/join')
  joinByLink(
    @Param('token') token: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.joinByLink(token, user.userId);
  }

  @Post('invitations/whiteboard/:token/accept')
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.whiteboards.acceptInvitationByToken(token, user.userId);
  }
}

// Public controller — no guard, so signed-out users can preview invite info
@Controller()
export class WhiteboardInvitationsPublicController {
  constructor(private readonly whiteboards: WhiteboardsService) {}

  @Get('invitations/whiteboard/:token')
  get(@Param('token') token: string) {
    return this.whiteboards.getInvitationByToken(token);
  }
}
