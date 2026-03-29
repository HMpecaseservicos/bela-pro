import { Controller, Get, Post, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    workspaceId?: string;
    role?: string;
    isSuperAdmin?: boolean;
  };
}

@Controller('api/v1/two-factor')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private twoFactorService: TwoFactorService) {}

  /**
   * Get 2FA status for current user
   */
  @Get('status')
  async getStatus(@Req() req: AuthenticatedRequest) {
    return this.twoFactorService.getStatus(req.user.userId);
  }

  /**
   * Generate TOTP secret and QR code
   */
  @Post('setup')
  async setup(@Req() req: AuthenticatedRequest) {
    return this.twoFactorService.generateSecret(req.user.userId);
  }

  /**
   * Verify code and enable 2FA
   */
  @Post('enable')
  async enable(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ) {
    const result = await this.twoFactorService.enableTwoFactor(req.user.userId, body.code);
    return {
      message: '2FA habilitado com sucesso!',
      backupCodes: result.backupCodes,
    };
  }

  /**
   * Disable 2FA
   */
  @Delete('disable')
  async disable(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ) {
    await this.twoFactorService.disableTwoFactor(req.user.userId, body.code);
    return { message: '2FA desabilitado com sucesso' };
  }

  /**
   * Regenerate backup codes
   */
  @Post('backup-codes')
  async regenerateBackupCodes(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ) {
    const result = await this.twoFactorService.regenerateBackupCodes(req.user.userId, body.code);
    return {
      message: 'Novos códigos de backup gerados',
      backupCodes: result.backupCodes,
    };
  }

  /**
   * Verify 2FA code (for login flow or sensitive operations)
   */
  @Post('verify')
  async verify(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ) {
    const isValid = await this.twoFactorService.verifyCode(req.user.userId, body.code);
    if (!isValid) {
      return { valid: false, message: 'Código inválido' };
    }
    return { valid: true, message: 'Código válido' };
  }
}

/**
 * Admin-only 2FA management endpoints
 */
@Controller('api/v1/admin/two-factor')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminTwoFactorController {
  constructor(private twoFactorService: TwoFactorService) {}

  /**
   * Check if 2FA is enabled for a specific user
   */
  @Get('status/:userId')
  async getUserStatus(@Req() req: AuthenticatedRequest & { params: { userId: string } }) {
    return this.twoFactorService.getStatus(req.params.userId);
  }
}
