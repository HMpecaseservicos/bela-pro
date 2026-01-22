/**
 * Message Events - Definição de eventos de mensagem
 * 
 * Este arquivo contém APENAS definições de eventos.
 * Nenhuma lógica de negócio é executada aqui.
 * Os eventos são identificadores padronizados para templates de mensagem.
 * 
 * @module message-templates
 */

/**
 * Tipos de eventos de mensagem suportados
 * Espelha o enum MessageEventType do Prisma
 */
export enum MessageEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_REMINDER_24H = 'APPOINTMENT_REMINDER_24H',
  APPOINTMENT_REMINDER_2H = 'APPOINTMENT_REMINDER_2H',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
}

/**
 * Metadados de cada evento para exibição no admin
 */
export interface MessageEventMeta {
  type: MessageEventType;
  label: string;
  description: string;
  defaultMessage: string;
}

/**
 * Lista de eventos com metadados para UI
 */
export const MESSAGE_EVENTS: MessageEventMeta[] = [
  {
    type: MessageEventType.APPOINTMENT_CREATED,
    label: 'Agendamento Criado',
    description: 'Enviado quando um novo agendamento é criado (aguardando confirmação)',
    defaultMessage: 'Olá {{clientName}}! 🗓️\n\nSeu agendamento foi recebido:\n📅 {{date}} às {{time}}\n💇 {{serviceName}}\n\nAguarde a confirmação!',
  },
  {
    type: MessageEventType.APPOINTMENT_CONFIRMED,
    label: 'Agendamento Confirmado',
    description: 'Enviado quando o agendamento é confirmado pelo profissional',
    defaultMessage: 'Olá {{clientName}}! ✅\n\nSeu agendamento está confirmado:\n📅 {{date}} às {{time}}\n💇 {{serviceName}}\n📍 {{workspaceName}}\n\nTe esperamos!',
  },
  {
    type: MessageEventType.APPOINTMENT_REMINDER_24H,
    label: 'Lembrete 24h',
    description: 'Lembrete enviado 24 horas antes do agendamento',
    defaultMessage: 'Olá {{clientName}}! ⏰\n\nLembrete: amanhã você tem horário marcado:\n📅 {{date}} às {{time}}\n💇 {{serviceName}}\n\nConfirma sua presença?',
  },
  {
    type: MessageEventType.APPOINTMENT_REMINDER_2H,
    label: 'Lembrete 2h',
    description: 'Lembrete enviado 2 horas antes do agendamento',
    defaultMessage: 'Olá {{clientName}}! ⏰\n\nDaqui a pouco é o seu horário:\n📅 Hoje às {{time}}\n💇 {{serviceName}}\n\nEstamos te esperando!',
  },
  {
    type: MessageEventType.APPOINTMENT_CANCELLED,
    label: 'Agendamento Cancelado',
    description: 'Enviado quando o agendamento é cancelado',
    defaultMessage: 'Olá {{clientName}}.\n\nSeu agendamento de {{date}} às {{time}} foi cancelado.\n\nCaso queira reagendar, acesse nosso link de agendamento.',
  },
];

/**
 * Variáveis disponíveis para templates
 */
export const TEMPLATE_VARIABLES = [
  { key: 'clientName', label: 'Nome do cliente', example: 'Maria' },
  { key: 'serviceName', label: 'Nome do serviço', example: 'Corte + Escova' },
  { key: 'date', label: 'Data do agendamento', example: '25/01/2026' },
  { key: 'time', label: 'Horário', example: '14:30' },
  { key: 'workspaceName', label: 'Nome do estabelecimento', example: 'Studio da Ana' },
] as const;

export type TemplateVariableKey = typeof TEMPLATE_VARIABLES[number]['key'];
