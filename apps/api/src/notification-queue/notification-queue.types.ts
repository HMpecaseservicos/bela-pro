/**
 * Types para o sistema de fila de notificações WhatsApp
 * 
 * @module notification-queue
 */

export const NOTIFICATION_QUEUE_NAME = 'whatsapp-notifications';

export interface NotificationJobData {
  /** ID do workspace (multi-tenant) */
  workspaceId: string;
  
  /** ID do agendamento (para rastreio) */
  appointmentId?: string;
  
  /** Telefone do destinatário (formato: 5511999999999) */
  toPhone: string;
  
  /** Chave do template (BOT_NOTIFY_*) */
  templateKey: string;
  
  /** Variáveis do template */
  variables: {
    clientName: string;
    serviceName?: string;
    date?: string;
    time?: string;
    workspaceName?: string;
    [key: string]: string | undefined;
  };
  
  /** Timestamp de criação do job */
  createdAt: string;
  
  /** Tentativa atual (para logs) */
  attempt?: number;
}

export interface NotificationJobResult {
  success: boolean;
  workspaceId: string;
  toPhone: string;
  templateKey: string;
  error?: string;
  sentAt?: string;
}

/**
 * Status possíveis do envio
 */
export enum NotificationStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  SESSION_NOT_CONNECTED = 'SESSION_NOT_CONNECTED',
  TEMPLATE_DISABLED = 'TEMPLATE_DISABLED',
}
