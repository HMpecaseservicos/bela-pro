import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { JwtSubject } from './auth.types';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  async signup(@Body() body: unknown) {
    return this.auth.signup(body);
  }

  @Post('register')
  async register(@Body() body: unknown) {
    // Alias for signup
    return this.auth.signup(body);
  }

  @Post('login')
  async login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  /** Get invite info (public) */
  @Get('invite/:token')
  async getInviteInfo(@Param('token') token: string) {
    return this.auth.getInviteInfo(token);
  }

  /** Accept invite and create/update user (public) */
  @Post('accept-invite')
  async acceptInvite(@Body() body: unknown) {
    return this.auth.acceptInvite(body);
  }

  /** Get user's workspaces (authenticated) */
  @UseGuards(AuthGuard('jwt'))
  @Get('workspaces')
  async getWorkspaces(@Req() req: Request) {
    const user = req.user as JwtSubject;
    return this.auth.getUserWorkspaces(user.userId);
  }

  /** Switch to a different workspace (authenticated) */
  @UseGuards(AuthGuard('jwt'))
  @Post('switch-workspace')
  async switchWorkspace(@Req() req: Request, @Body() body: unknown) {
    const user = req.user as JwtSubject;
    return this.auth.switchWorkspace(user.userId, body);
  }
}

@Controller('api/v1')
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: Request) {
    const user = req.user as JwtSubject;
    // Fetch full user data including name
    const userData = await this.auth.getUserById(user.userId);
    return {
      userId: user.userId,
      workspaceId: user.workspaceId,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin || false,
      name: userData?.name || null,
      email: userData?.email || null,
    };
  }
}
