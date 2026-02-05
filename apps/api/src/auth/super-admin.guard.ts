import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { JwtSubject } from './auth.types';

/**
 * Guard que verifica se o usuário é um Super Admin.
 * Deve ser usado após JwtAuthGuard.
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, SuperAdminGuard)
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtSubject | undefined;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Acesso restrito a Super Administradores');
    }

    return true;
  }
}
