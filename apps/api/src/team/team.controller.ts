import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { TeamService } from './team.service';
import type { JwtSubject } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('team')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async getTeam(@Req() req: Request) {
    const user = req.user as JwtSubject;
    return this.teamService.getTeamMembers(user.workspaceId);
  }

  @Get('invites')
  @Roles('OWNER')
  async getPendingInvites(@Req() req: Request) {
    const user = req.user as JwtSubject;
    return this.teamService.getPendingInvites(user.workspaceId);
  }

  @Post('invite')
  @Roles('OWNER')
  async inviteMember(@Req() req: Request, @Body() body: unknown) {
    const user = req.user as JwtSubject;
    return this.teamService.inviteMember(user.workspaceId, user.userId, body);
  }

  @Delete('invites/:inviteId')
  @Roles('OWNER')
  async cancelInvite(
    @Req() req: Request,
    @Param('inviteId') inviteId: string,
  ) {
    const user = req.user as JwtSubject;
    return this.teamService.cancelInvite(user.workspaceId, user.userId, inviteId);
  }

  @Patch(':membershipId')
  @Roles('OWNER')
  async updateMember(
    @Req() req: Request,
    @Param('membershipId') membershipId: string,
    @Body() body: unknown,
  ) {
    const user = req.user as JwtSubject;
    return this.teamService.updateMember(user.workspaceId, user.userId, membershipId, body);
  }

  @Delete(':membershipId')
  @Roles('OWNER')
  async removeMember(
    @Req() req: Request,
    @Param('membershipId') membershipId: string,
  ) {
    const user = req.user as JwtSubject;
    return this.teamService.removeMember(user.workspaceId, user.userId, membershipId);
  }
}
