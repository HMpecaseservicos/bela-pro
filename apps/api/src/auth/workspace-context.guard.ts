import { ForbiddenException } from '@nestjs/common';
import type { JwtSubject } from './auth.types';

/**
 * Valida que o usuário tem um workspaceId definido.
 * Usado em controllers que requerem contexto de workspace.
 * Super Admins sem workspace ativo receberão erro.
 * 
 * @throws ForbiddenException se workspaceId for null
 */
export function requireWorkspaceContext(user: JwtSubject): asserts user is JwtSubject & { workspaceId: string } {
  if (!user.workspaceId) {
    throw new ForbiddenException(
      'Esta operação requer contexto de workspace. Use /auth/switch-workspace para selecionar um workspace.'
    );
  }
}
