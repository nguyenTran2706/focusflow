import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { WorkspacesService } from './workspaces.service.js';
import { CreateWorkspaceDto, InviteToWorkspaceDto } from './dto/index.js';

@UseGuards(JwtAuthGuard)
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

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.workspaces.findOneOrFail(id, user.userId);
  }

  @Post(':id/invites')
  invite(
    @Param('id') id: string,
    @Body() dto: InviteToWorkspaceDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.workspaces.invite(id, dto, user.userId);
  }
}
