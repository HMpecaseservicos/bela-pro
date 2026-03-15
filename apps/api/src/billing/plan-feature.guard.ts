import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService } from './billing.service';

// ==================== METADATA KEYS ====================

export const REQUIRED_FEATURES_KEY = 'requiredFeatures';
export const REQUIRED_PLAN_TIER_KEY = 'requiredPlanTier';

// ==================== DECORATORS ====================

/**
 * Decorator para exigir features específicas do plano
 * @example @RequireFeatures('chatbot', 'whatsapp')
 */
export const RequireFeatures = (...features: string[]) => 
  SetMetadata(REQUIRED_FEATURES_KEY, features);

/**
 * Decorator para exigir tier mínimo do plano
 * @example @RequirePlanTier('PRO')
 */
export const RequirePlanTier = (tier: 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE') => 
  SetMetadata(REQUIRED_PLAN_TIER_KEY, tier);

/**
 * Decorator para exigir plano pago (qualquer)
 * @example @RequirePremium()
 */
export const RequirePremium = () => RequirePlanTier('PRO');

// ==================== GUARDS ====================

/**
 * Guard que verifica se o workspace tem as features necessárias
 */
@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(REQUIRED_FEATURES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredTier = this.reflector.getAllAndOverride<string>(REQUIRED_PLAN_TIER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se não tem requirements, libera
    if (!requiredFeatures?.length && !requiredTier) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const workspaceId = request.user?.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException('Workspace não identificado');
    }

    const planInfo = await this.billingService.getWorkspacePlanInfo(workspaceId);

    // Verificar tier mínimo
    if (requiredTier) {
      const tierOrder: Record<string, number> = { FREE: 0, PRO: 1, BUSINESS: 2, ENTERPRISE: 3 };
      const currentTier = (planInfo.plan as any)?.tier || 'FREE';
      
      if ((tierOrder[currentTier] || 0) < (tierOrder[requiredTier] || 0)) {
        throw new ForbiddenException({
          code: 'PLAN_UPGRADE_REQUIRED',
          message: `Este recurso requer o plano ${requiredTier} ou superior`,
          currentPlan: planInfo.plan?.name || 'Gratuito',
          requiredTier,
          upgradeUrl: '/dashboard/planos',
        });
      }
    }

    // Verificar features específicas
    if (requiredFeatures?.length) {
      const missingFeatures: string[] = [];

      for (const feature of requiredFeatures) {
        const hasFeature = await this.billingService.checkFeature(workspaceId, feature);
        if (!hasFeature) {
          missingFeatures.push(feature);
        }
      }

      if (missingFeatures.length > 0) {
        const featureLabels: Record<string, string> = {
          chatbot: 'Chatbot',
          whatsapp: 'WhatsApp',
          financial: 'Módulo Financeiro',
          pix: 'Pagamento PIX',
          reports: 'Relatórios Avançados',
          reminders: 'Lembretes Automáticos',
          localSponsors: 'Patrocinadores Locais',
          hideAds: 'Ocultar Anúncios',
        };

        throw new ForbiddenException({
          code: 'FEATURE_NOT_AVAILABLE',
          message: `Recurso não disponível no seu plano atual`,
          missingFeatures: missingFeatures.map(f => featureLabels[f] || f),
          currentPlan: planInfo.plan?.name || 'Gratuito',
          upgradeUrl: '/dashboard/planos',
        });
      }
    }

    return true;
  }
}

/**
 * Guard que verifica se o workspace é premium (plano pago ou trial ativo)
 */
@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private readonly billingService: BillingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const workspaceId = request.user?.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException('Workspace não identificado');
    }

    const planInfo = await this.billingService.getWorkspacePlanInfo(workspaceId);

    if (!planInfo.isPremium && !planInfo.isTrialing) {
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message: 'Este recurso é exclusivo para assinantes',
        currentPlan: planInfo.plan?.name || 'Gratuito',
        upgradeUrl: '/dashboard/planos',
      });
    }

    // Se está em trial, verificar se não expirou
    if (planInfo.trialExpired) {
      throw new ForbiddenException({
        code: 'TRIAL_EXPIRED',
        message: 'Seu período de teste expirou. Assine para continuar usando.',
        upgradeUrl: '/dashboard/planos',
      });
    }

    return true;
  }
}
