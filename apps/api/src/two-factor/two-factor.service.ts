import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

// Simple TOTP implementation (base32 encoding/decoding and OTP generation)
// In production, consider using packages like 'otpauth' or 'speakeasy'

@Injectable()
export class TwoFactorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a new TOTP secret for a user
   */
  async generateSecret(userId: string): Promise<{ secret: string; otpauthUrl: string; qrCodeUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA já está habilitado. Desabilite primeiro para reconfigurar.');
    }

    // Generate 20 random bytes and encode as base32
    const secret = this.generateBase32Secret(20);
    const issuer = 'BELA PRO';
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    // QR code URL using Google Charts API (for simplicity)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    // Store the secret temporarily (not enabled yet)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, otpauthUrl, qrCodeUrl };
  }

  /**
   * Verify TOTP code and enable 2FA
   */
  async enableTwoFactor(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('Configure o 2FA primeiro');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA já está habilitado');
    }

    // Verify the code
    const isValid = this.verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) {
      throw new BadRequestException('Código inválido. Tente novamente.');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(8);
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    return { backupCodes };
  }

  /**
   * Disable 2FA for a user
   */
  async disableTwoFactor(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true, twoFactorBackupCodes: true },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA não está habilitado');
    }

    // Verify code or backup code
    const isValidTotp = this.verifyTOTP(user.twoFactorSecret!, code);
    const isValidBackup = this.verifyBackupCode(code, user.twoFactorBackupCodes);

    if (!isValidTotp && !isValidBackup) {
      throw new BadRequestException('Código inválido');
    }

    // Disable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });
  }

  /**
   * Verify 2FA code during login
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true, twoFactorBackupCodes: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    // Try TOTP first
    if (this.verifyTOTP(user.twoFactorSecret, code)) {
      return true;
    }

    // Try backup code
    if (await this.verifyAndConsumeBackupCode(userId, code, user.twoFactorBackupCodes)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user has 2FA enabled
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return user?.twoFactorEnabled || false;
  }

  /**
   * Get 2FA status for user
   */
  async getStatus(userId: string): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorBackupCodes: true },
    });

    return {
      enabled: user?.twoFactorEnabled || false,
      backupCodesRemaining: user?.twoFactorBackupCodes?.length || 0,
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA não está habilitado');
    }

    // Verify current code
    const isValid = this.verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) {
      throw new BadRequestException('Código inválido');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes(8);
    const hashedBackupCodes = backupCodes.map(c => this.hashBackupCode(c));

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: hashedBackupCodes },
    });

    return { backupCodes };
  }

  // ============ PRIVATE HELPERS ============

  private generateBase32Secret(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += charset[bytes[i] % 32];
    }
    return result;
  }

  private verifyTOTP(secret: string, code: string, window = 1): boolean {
    const normalizedCode = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(normalizedCode)) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const period = 30;

    // Check current and adjacent time windows
    for (let i = -window; i <= window; i++) {
      const counter = Math.floor((now + i * period) / period);
      const expectedCode = this.generateTOTP(secret, counter);
      if (expectedCode === normalizedCode) {
        return true;
      }
    }
    return false;
  }

  private generateTOTP(secret: string, counter: number): string {
    // Decode base32 secret
    const key = this.base32Decode(secret);
    
    // Convert counter to 8-byte buffer (big-endian)
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const hash = hmac.digest();

    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    // Generate 6-digit code
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  private base32Decode(encoded: string): Buffer {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const normalized = encoded.toUpperCase().replace(/=+$/, '');
    
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (const char of normalized) {
      const index = charset.indexOf(char);
      if (index === -1) continue;
      
      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        output.push((value >> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.replace(/-/g, '')).digest('hex');
  }

  private verifyBackupCode(code: string, hashedCodes: string[]): boolean {
    const hash = this.hashBackupCode(code);
    return hashedCodes.includes(hash);
  }

  private async verifyAndConsumeBackupCode(userId: string, code: string, hashedCodes: string[]): Promise<boolean> {
    const hash = this.hashBackupCode(code);
    const index = hashedCodes.indexOf(hash);
    
    if (index === -1) {
      return false;
    }

    // Remove the used backup code
    const newCodes = [...hashedCodes];
    newCodes.splice(index, 1);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: newCodes },
    });

    return true;
  }
}
