/**
 * Chat Usage Billing Types
 * 
 * Sistema de billing baseado em conversas (modelo Meta)
 * - 1 conversa = janela de 24h
 * - Múltiplas mensagens dentro de 24h = 1 conversa
 */

// ============================================================================
// CONSTANTES DE PLANOS
// ============================================================================

/**
 * Tipos de plano disponíveis
 */
export type WorkspacePlanType = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

/**
 * Limite de conversas por plano (por mês)
 * Facilmente configurável e preparado para vir do banco futuramente
 */
export const PLAN_CONVERSATION_LIMITS: Record<WorkspacePlanType, number> = {
  FREE: 50,           // Teste gratuito
  BASIC: 300,         // Plano básico
  PRO: 1000,          // Plano profissional
  ENTERPRISE: 10000,  // Plano enterprise (praticamente ilimitado)
};

/**
 * Duração da janela de conversa em milissegundos (24 horas)
 */
export const CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Duração da janela em horas (para logs)
 */
export const CONVERSATION_WINDOW_HOURS = 24;

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Resultado da verificação de conversa ativa
 */
export interface ActiveConversationCheck {
  /** Se há uma conversa ativa (dentro da janela de 24h) */
  isActive: boolean;
  /** ID da conversa ativa (se existir) */
  conversationId?: string;
  /** Quando a janela atual termina */
  windowEndsAt?: Date;
  /** Quanto tempo resta na janela (ms) */
  remainingMs?: number;
}

/**
 * Resultado do registro de nova conversa
 */
export interface ConversationRegistrationResult {
  /** Se a conversa foi registrada com sucesso */
  success: boolean;
  /** Se a conversa foi contabilizada como excedente */
  isExcess: boolean;
  /** Total de conversas usadas no mês */
  conversationsUsed: number;
  /** Limite do mês */
  conversationsLimit: number;
  /** Total de excedentes no mês */
  excessConversations: number;
  /** Mês de referência (YYYY-MM) */
  yearMonth: string;
  /** ID do registro de billing criado */
  billingEventId?: string;
}

/**
 * Uso mensal de conversas
 */
export interface MonthlyUsage {
  /** ID do registro */
  id: string;
  /** ID do workspace */
  workspaceId: string;
  /** Mês de referência (YYYY-MM) */
  yearMonth: string;
  /** Conversas usadas dentro do limite */
  conversationsUsed: number;
  /** Limite do mês */
  conversationsLimit: number;
  /** Conversas excedentes */
  excessConversations: number;
  /** Última conversa registrada */
  lastConversationAt: Date | null;
  /** Se o limite foi atingido */
  limitReached: boolean;
  /** Percentual de uso (0-100+) */
  usagePercentage: number;
}

/**
 * Contexto para processamento de mensagem no webhook
 */
export interface MessageContext {
  /** ID do workspace */
  workspaceId: string;
  /** ID da conversa */
  conversationId: string;
  /** Telefone do cliente (E.164) */
  phoneE164: string;
  /** Timestamp da última mensagem na conversa */
  lastMessageAt: Date | null;
}

/**
 * Resultado do processamento de billing para uma mensagem
 */
export interface BillingProcessResult {
  /** Se deve processar a mensagem (sempre true - nunca bloqueamos) */
  shouldProcess: true;
  /** Se uma nova conversa foi registrada */
  newConversationRegistered: boolean;
  /** Se está dentro do limite ou é excedente */
  isExcess: boolean;
  /** Uso atual do mês */
  monthlyUsage: MonthlyUsage;
}

/**
 * Evento de log para observabilidade
 */
export type BillingLogEvent = 
  | 'NEW_CONVERSATION_DETECTED'
  | 'CONVERSATION_REUSED'
  | 'LIMIT_REACHED'
  | 'EXCESS_REGISTERED'
  | 'MONTHLY_USAGE_CREATED'
  | 'BILLING_ERROR';

/**
 * Payload de log estruturado
 */
export interface BillingLogPayload {
  event: BillingLogEvent;
  workspaceId: string;
  yearMonth: string;
  conversationId?: string;
  phoneE164?: string;
  conversationsUsed?: number;
  conversationsLimit?: number;
  excessConversations?: number;
  isExcess?: boolean;
  windowEndsAt?: Date;
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Gera o yearMonth atual no formato YYYY-MM
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Calcula o fim da janela de 24h a partir de um timestamp
 */
export function calculateWindowEnd(startAt: Date): Date {
  return new Date(startAt.getTime() + CONVERSATION_WINDOW_MS);
}

/**
 * Verifica se uma janela ainda está ativa
 */
export function isWindowActive(windowEndAt: Date): boolean {
  return windowEndAt.getTime() > Date.now();
}

/**
 * Obtém o limite de conversas para um plano
 */
export function getConversationLimit(plan: string): number {
  const planKey = plan as WorkspacePlanType;
  return PLAN_CONVERSATION_LIMITS[planKey] ?? PLAN_CONVERSATION_LIMITS.BASIC;
}
