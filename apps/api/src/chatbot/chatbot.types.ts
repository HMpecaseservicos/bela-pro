/**
 * WhatsApp Types
 * 
 * Tipos para integração com WhatsApp Cloud API (futura).
 * 
 * @version 2.0.0 - Simplificado (Evolution removido)
 */

// ==========================================================================
// OUTGOING MESSAGES (Enviadas pela API)
// ==========================================================================

export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    preview_url: boolean;
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
    header?: { type: 'text'; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      buttons: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
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
    header?: { type: 'text'; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      button: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

export type WhatsAppOutgoingMessage =
  | WhatsAppTextMessage
  | WhatsAppButtonMessage
  | WhatsAppListMessage;
