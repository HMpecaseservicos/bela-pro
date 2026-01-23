/**
 * Chatbot Types
 * 
 * Tipos e interfaces para o chatbot WhatsApp BELA PRO
 */

// ============================================================================
// ENUMS (espelhando Prisma)
// ============================================================================

export enum ChatConversationState {
  START = 'START',
  CHOOSE_SERVICE = 'CHOOSE_SERVICE',
  CHOOSE_DATE = 'CHOOSE_DATE',
  CHOOSE_TIME = 'CHOOSE_TIME',
  CONFIRM = 'CONFIRM',
  DONE = 'DONE',
  HUMAN_HANDOFF = 'HUMAN_HANDOFF',
}

export enum ChatChannel {
  WHATSAPP = 'WHATSAPP',
}

// ============================================================================
// WHATSAPP CLOUD API TYPES
// ============================================================================

/**
 * Webhook payload do WhatsApp Cloud API
 */
export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: {
    messaging_product: 'whatsapp';
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WhatsAppContact[];
    messages?: WhatsAppIncomingMessage[];
    statuses?: WhatsAppMessageStatus[];
  };
  field: 'messages';
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppIncomingMessage {
  from: string; // Phone number (e.g., "5511999999999")
  id: string;
  timestamp: string;
  type: 'text' | 'button' | 'interactive' | 'image' | 'audio' | 'document' | 'location';
  text?: {
    body: string;
  };
  button?: {
    text: string;
    payload: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

export interface WhatsAppMessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}

// ============================================================================
// OUTGOING MESSAGE TYPES
// ============================================================================

export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export interface WhatsAppButtonMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string; // Max 20 chars
        };
      }>;
    };
  };
}

export interface WhatsAppListMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      button: string; // CTA button text
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string; // Max 24 chars
          description?: string; // Max 72 chars
        }>;
      }>;
    };
  };
}

export type WhatsAppOutgoingMessage = 
  | WhatsAppTextMessage 
  | WhatsAppButtonMessage 
  | WhatsAppListMessage;

// ============================================================================
// STATE MACHINE TYPES
// ============================================================================

/**
 * Contexto da conversa (armazenado em ChatbotConversation.contextJson)
 */
export interface ConversationContext {
  // Cliente
  clientName?: string;
  clientPhone: string;
  
  // Seleções do fluxo
  selectedServiceId?: string;
  selectedServiceName?: string;
  selectedDate?: string; // YYYY-MM-DD
  selectedTime?: string; // HH:MM
  selectedSlotStart?: string; // ISO datetime
  
  // Controle de fluxo
  attemptCount: number;
  lastAction?: string;
  
  // Dados extras
  appointmentId?: string;
  pendingConfirmation?: boolean;
}

/**
 * Resultado da transição de estado
 */
export interface StateTransition {
  nextState: ChatConversationState;
  response: WhatsAppOutgoingMessage;
  context?: Partial<ConversationContext>;
  shouldSave?: boolean;
}

/**
 * Handler de estado
 */
export type StateHandler = (
  context: ConversationContext,
  message: string,
  workspaceId: string,
  payload?: WhatsAppIncomingMessage,
) => Promise<StateTransition>;

/**
 * Mapa de handlers por estado
 */
export type StateHandlerMap = {
  [K in ChatConversationState]: StateHandler;
};

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface ConversationData {
  id: string;
  workspaceId: string;
  phoneE164: string;
  state: ChatConversationState;
  context: ConversationContext;
  isHumanHandoff: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncomingMessageData {
  workspaceId: string;
  phoneE164: string;
  contactName: string;
  messageId: string;
  messageText: string;
  messageType: string;
  rawPayload: WhatsAppIncomingMessage;
  phoneNumberId: string;
}

// ============================================================================
// KEYWORDS
// ============================================================================

export const HUMAN_HANDOFF_KEYWORDS = [
  'humano',
  'atendente',
  'pessoa',
  'falar com alguem',
  'falar com alguém',
  'ajuda',
  'help',
  'atendimento',
];

export const CANCEL_KEYWORDS = [
  'cancelar',
  'desistir',
  'sair',
  'voltar',
  'menu',
  'inicio',
  'início',
];

export const CONFIRM_KEYWORDS = [
  'sim',
  'confirmar',
  'confirmo',
  'ok',
  'certo',
  'isso',
  'pode',
  'bora',
  'vamos',
  'yes',
];

export const DENY_KEYWORDS = [
  'nao',
  'não',
  'no',
  'errado',
  'mudar',
  'trocar',
  'corrigir',
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normaliza número de telefone para E.164
 */
export function normalizePhoneE164(phone: string): string {
  // Remove tudo exceto números
  const digits = phone.replace(/\D/g, '');
  
  // Se não começa com +, assume Brasil
  if (!phone.startsWith('+')) {
    return `+${digits}`;
  }
  
  return `+${digits}`;
}

/**
 * Verifica se mensagem contém keyword
 */
export function containsKeyword(message: string, keywords: string[]): boolean {
  const normalized = message.toLowerCase().trim();
  return keywords.some(keyword => normalized.includes(keyword));
}

/**
 * Extrai texto da mensagem (suporta text, button, interactive)
 */
export function extractMessageText(message: WhatsAppIncomingMessage): string {
  if (message.text) {
    return message.text.body;
  }
  
  if (message.button) {
    return message.button.payload || message.button.text;
  }
  
  if (message.interactive) {
    if (message.interactive.button_reply) {
      return message.interactive.button_reply.id;
    }
    if (message.interactive.list_reply) {
      return message.interactive.list_reply.id;
    }
  }
  
  return '';
}

/**
 * Formata preço em centavos para exibição
 */
export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceCents / 100);
}

/**
 * Formata duração em minutos para exibição
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
}

/**
 * Formata data para exibição
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Formata hora para exibição
 */
export function formatTime(timeStr: string): string {
  return timeStr.replace(':', 'h');
}
