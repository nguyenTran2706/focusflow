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
import { DiagramsService } from './diagrams.service.js';
import {
  CreateDiagramDto,
  UpdateDiagramDto,
  BroadcastDiagramDto,
  InviteDiagramCollaboratorsDto,
  UpdateDiagramCollaboratorDto,
  UpdateDiagramLinkAccessDto,
} from './dto/index.js';

@UseGuards(ClerkAuthGuard)
@Controller()
export class DiagramsController {
  constructor(private readonly diagrams: DiagramsService) {}

  @Get('boards/:boardId/diagrams')
  list(
    @Param('boardId') boardId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.listDiagrams(boardId, user.userId);
  }

  @Post('boards/:boardId/diagrams')
  create(
    @Param('boardId') boardId: string,
    @Body() dto: CreateDiagramDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.createDiagram(boardId, dto, user.userId);
  }

  @Get('diagrams/:id')
  get(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.getDiagram(id, user.userId);
  }

  @Patch('diagrams/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDiagramDto,
    @CurrentUser() user: { userId: string },
    @Headers('x-socket-id') socketId?: string,
  ) {
    return this.diagrams.updateDiagram(id, dto, user.userId, socketId);
  }

  @Delete('diagrams/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.deleteDiagram(id, user.userId);
  }

  @Post('diagrams/:id/broadcast')
  broadcast(
    @Param('id') id: string,
    @Body() dto: BroadcastDiagramDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.broadcast(id, dto, user.userId);
  }

  // ── Sharing ──────────────────────────────────────────────────────────

  @Get('diagrams/:id/share')
  getShare(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.getShareInfo(id, user.userId);
  }

  @Post('diagrams/:id/invitations')
  invite(
    @Param('id') id: string,
    @Body() dto: InviteDiagramCollaboratorsDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.inviteCollaborators(id, dto, user.userId);
  }

  @Patch('diagrams/:id/collaborators/:userId')
  updateCollab(
    @Param('id') id: string,
    @Param('userId') collabUserId: string,
    @Body() dto: UpdateDiagramCollaboratorDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.updateCollaborator(id, collabUserId, dto, user.userId);
  }

  @Delete('diagrams/:id/collaborators/:userId')
  removeCollab(
    @Param('id') id: string,
    @Param('userId') collabUserId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.removeCollaborator(id, collabUserId, user.userId);
  }

  @Delete('diagrams/:id/invitations/:invitationId')
  revokeInvite(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.revokeInvitation(id, invitationId, user.userId);
  }

  @Patch('diagrams/:id/link-access')
  updateLinkAccess(
    @Param('id') id: string,
    @Body() dto: UpdateDiagramLinkAccessDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.updateLinkAccess(id, dto, user.userId);
  }

  @Post('diagrams/by-link/:token/join')
  joinByLink(
    @Param('token') token: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.joinByLink(token, user.userId);
  }

  @Post('invitations/diagram/:token/accept')
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.diagrams.acceptInvitationByToken(token, user.userId);
  }
}

@Controller()
export class DiagramInvitationsPublicController {
  constructor(private readonly diagrams: DiagramsService) {}

  @Get('invitations/diagram/:token')
  get(@Param('token') token: string) {
    return this.diagrams.getInvitationByToken(token);
  }
}
