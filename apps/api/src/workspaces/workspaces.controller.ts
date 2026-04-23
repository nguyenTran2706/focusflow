import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { WorkspacesService } from './workspaces.service.js';
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteToWorkspaceDto } from './dto/index.js';

@UseGuards(ClerkAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.workspaces.create(dto, user.userId);
  }

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.workspaces.listForUser(user.userId);
  }

  @Get('limits')
  getLimits(@CurrentUser() user: { userId: string }) {
    return this.workspaces.getLimits(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.workspaces.findOneOrFail(id, user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.workspaces.update(id, dto, user.userId);
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.workspaces.delete(id, user.userId);
  }

  @Get(':id/members')
  listMembers(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.workspaces.listMembers(id, user.userId);
  }

  @Get(':id/summary')
  getSummary(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.workspaces.getSummary(id, user.userId);
  }

  @Post(':id/invites')
  invite(
    @Param('id') id: string,
    @Body() dto: InviteToWorkspaceDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.workspaces.invite(id, dto, user.userId);
  }

  @Post('invites/:token/accept')
  acceptInvite(
    @Param('token') token: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.workspaces.acceptInvite(token, user.userId);
  }
}
