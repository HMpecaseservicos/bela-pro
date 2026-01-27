/**
 * WhatsApp Bot Service
 * 
 * Serviço responsável por:
 * - Processar mensagens recebidas
 * - Buscar templates do banco (ChatbotTemplate)
 * - Responder usando templates CONFIGURÁVEIS
 * 
 * IMPORTANTE: 
 * - Templates do BOT são da tabela ChatbotTemplate (chaves BOT_*)
 * - Templates MANUAIS são da tabela MessageTemplate (APPOINTMENT_*, etc.)
 * - O bot usa SOMENTE ChatbotTemplate
 * 
 * @module chatbot
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppSessionManager } from './whatsapp-session.manager';
import { IncomingWhatsAppMessage, BotMessageContext, TemplateVariables } from './whatsapp.types';
import { renderTemplate } from '../message-templates/template-renderer';

// Chaves de template do bot (usadas na tabela ChatbotTemplate)
export enum BotTemplateKey {
  // Templates de conversa (quando cliente envia mensagem)
  WELCOME = 'BOT_WELCOME',           // Mensagem de boas-vindas
  MENU = 'BOT_MENU',                 // Menu principal
  HELP = 'BOT_HELP',                 // Ajuda
  UNKNOWN_COMMAND = 'BOT_UNKNOWN',   // Comando não reconhecido
  HUMAN_HANDOFF = 'BOT_HUMAN',       // Transferência para humano
  BOOKING_LINK = 'BOT_BOOKING_LINK', // Link de agendamento
  NO_APPOINTMENTS = 'BOT_NO_APPOINTMENTS', // Sem agendamentos
  APPOINTMENTS_LIST = 'BOT_APPOINTMENTS_LIST', // Lista de agendamentos
  
  // Templates de notificação (eventos automáticos do sistema)
  NOTIFY_APPOINTMENT_CONFIRMED = 'BOT_NOTIFY_CONFIRMED',   // Agendamento confirmado
  NOTIFY_APPOINTMENT_CREATED = 'BOT_NOTIFY_CREATED',       // Agendamento criado
  NOTIFY_APPOINTMENT_CANCELLED = 'BOT_NOTIFY_CANCELLED',   // Agendamento cancelado
  NOTIFY_APPOINTMENT_REMINDER = 'BOT_NOTIFY_REMINDER',     // Lembrete de agendamento
}

// Metadados dos templates (label, descrição, conteúdo padrão)
export const BOT_TEMPLATE_DEFAULTS: Record<string, { label: string; description: string; content: string }> = {
  // === TEMPLATES DE CONVERSA ===
  [BotTemplateKey.WELCOME]: {
    label: 'Boas-vindas',
    description: 'Primeira mensagem quando cliente entra em contato',
    content: 'Olá {{clientName}}! 👋\n\nBem-vindo(a) à {{workspaceName}}!\n\nDigite:\n1️⃣ Agendar\n2️⃣ Meus agendamentos\n3️⃣ Falar com atendente',
  },
  [BotTemplateKey.MENU]: {
    label: 'Menu Principal',
    description: 'Menu de opções exibido quando cliente pede',
    content: 'Como posso ajudar?\n\n1️⃣ Agendar\n2️⃣ Meus agendamentos\n3️⃣ Falar com atendente',
  },
  [BotTemplateKey.HELP]: {
    label: 'Ajuda',
    description: 'Mensagem de ajuda',
    content: 'Precisa de ajuda? 🤔\n\nDigite o número da opção:\n1 - Agendar um serviço\n2 - Ver seus agendamentos\n3 - Falar com um atendente',
  },
  [BotTemplateKey.UNKNOWN_COMMAND]: {
    label: 'Comando não reconhecido',
    description: 'Quando o bot não entende a mensagem',
    content: 'Desculpe, não entendi. 😅\n\nDigite:\n1️⃣ Agendar\n2️⃣ Meus agendamentos\n3️⃣ Falar com atendente',
  },
  [BotTemplateKey.HUMAN_HANDOFF]: {
    label: 'Transferência para atendente',
    description: 'Quando cliente pede para falar com humano',
    content: 'Certo! Um atendente vai falar com você em breve. ⏳\n\nAguarde, por favor!',
  },
  [BotTemplateKey.BOOKING_LINK]: {
    label: 'Link de Agendamento',
    description: 'Mensagem com link para agendar',
    content: '📅 Para agendar, acesse o link:\n\n{{bookingLink}}\n\nÉ rápido e fácil! ✨',
  },
  [BotTemplateKey.NO_APPOINTMENTS]: {
    label: 'Sem Agendamentos',
    description: 'Quando cliente não tem agendamentos',
    content: 'Você não tem agendamentos futuros. 📅\n\nDigite 1 para agendar!',
  },
  [BotTemplateKey.APPOINTMENTS_LIST]: {
    label: 'Lista de Agendamentos',
    description: 'Header da lista de agendamentos',
    content: '📋 Seus próximos agendamentos:\n\n{{appointmentsList}}\n\nDigite 0 para voltar ao menu.',
  },
  
  // === TEMPLATES DE NOTIFICAÇÃO (eventos automáticos) ===
  [BotTemplateKey.NOTIFY_APPOINTMENT_CONFIRMED]: {
    label: '📩 Notificação: Agendamento Confirmado',
    description: 'Enviado automaticamente quando agendamento é confirmado',
    content: 'Olá {{clientName}}! ✅\n\nSeu agendamento está confirmado:\n📅 {{date}} às {{time}}\n💇 {{serviceName}}\n📍 {{workspaceName}}\n\nTe esperamos!',
  },
  [BotTemplateKey.NOTIFY_APPOINTMENT_CREATED]: {
    label: '📩 Notificação: Agendamento Criado',
    description: 'Enviado automaticamente quando agendamento é criado',
    content: 'Olá {{clientName}}! 🗓️\n\nSeu agendamento foi recebido:\n📅 {{date}} às {{time}}\n💇 {{serviceName}}\n\nAguarde a confirmação!',
  },
  [BotTemplateKey.NOTIFY_APPOINTMENT_CANCELLED]: {
    label: '📩 Notificação: Agendamento Cancelado',
    description: 'Enviado automaticamente quando agendamento é cancelado',
    content: 'Olá {{clientName}}.\n\nSeu agendamento de {{date}} às {{time}} foi cancelado.\n\nCaso queira reagendar, entre em contato! 📱',
  },
  [BotTemplateKey.NOTIFY_APPOINTMENT_REMINDER]: {
    label: '📩 Notificação: Lembrete',
    description: 'Lembrete enviado antes do agendamento',
    content: 'Olá {{clientName}}! ⏰\n\nLembrete: você tem horário marcado:\n📅 {{date}} às {{time}}\n💇 {{serviceName}}\n\nTe esperamos!',
  },
};

@Injectable()
export class WhatsAppBotService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppBotService.name);

  constructor(
    private readonly sessionManager: WhatsAppSessionManager,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Registra o handler de mensagens no startup
   */
  onModuleInit() {
    this.sessionManager.setMessageCallback(this.handleIncomingMessage.bind(this));
    this.logger.log('Bot handler registrado no SessionManager');
  }

  /**
   * Processa mensagem recebida
   */
  async handleIncomingMessage(message: IncomingWhatsAppMessage): Promise<void> {
    const { workspaceId, from, fromName, body, rawMessage } = message;

    this.logger.log(`[${workspaceId}] Mensagem de ${from}: "${body}"`);

    // Buscar dados do workspace
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, brandName: true },
    });

    if (!workspace) {
      this.logger.warn(`[${workspaceId}] Workspace não encontrado`);
      return;
    }

    // Montar contexto
    const context: BotMessageContext = {
      workspaceId,
      clientPhone: from,
      clientName: fromName || 'Cliente',
      messageText: body.trim().toLowerCase(),
    };

    const variables: TemplateVariables = {
      clientName: context.clientName,
      workspaceName: workspace.brandName || workspace.name,
    };

    // Processar comando
    const response = await this.processCommand(context, variables);

    if (response) {
      // Usa reply direto se tiver rawMessage, senão usa sendMessage
      if (rawMessage) {
        await this.sessionManager.replyToMessage(workspaceId, rawMessage, response);
      } else {
        await this.sessionManager.sendMessage(workspaceId, from, response);
      }
    }
  }

  /**
   * Processa comando do usuário e retorna resposta
   */
  private async processCommand(context: BotMessageContext, variables: TemplateVariables): Promise<string | null> {
    const { messageText, workspaceId } = context;

    // Primeiro contato ou saudação
    if (this.isGreeting(messageText)) {
      return this.getTemplate(workspaceId, BotTemplateKey.WELCOME, variables);
    }

    // Menu
    if (messageText === 'menu' || messageText === '0') {
      return this.getTemplate(workspaceId, BotTemplateKey.MENU, variables);
    }

    // Ajuda
    if (messageText === 'ajuda' || messageText === 'help' || messageText === '?') {
      return this.getTemplate(workspaceId, BotTemplateKey.HELP, variables);
    }

    // Agendar
    if (messageText === '1' || messageText.includes('agendar')) {
      return this.getBookingLinkMessage(workspaceId, variables);
    }

    // Meus agendamentos
    if (messageText === '2' || messageText.includes('agendamento')) {
      return this.getMyAppointmentsMessage(context);
    }

    // Falar com atendente
    if (messageText === '3' || messageText.includes('atendente') || messageText.includes('humano')) {
      return this.getTemplate(workspaceId, BotTemplateKey.HUMAN_HANDOFF, variables);
    }

    // Comando não reconhecido
    return this.getTemplate(workspaceId, BotTemplateKey.UNKNOWN_COMMAND, variables);
  }

  /**
   * Verifica se é uma saudação
   */
  private isGreeting(text: string): boolean {
    const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hi', 'hello', 'opa', 'eae', 'e aí'];
    return greetings.some(g => text.startsWith(g) || text === g);
  }

  /**
   * Busca template do banco (ChatbotTemplate)
   * 
   * IMPORTANTE: Usa SOMENTE templates do banco.
   * Se não encontrar, usa o default do BOT_TEMPLATE_DEFAULTS e loga aviso.
   * 
   * @param workspaceId - ID do workspace
   * @param templateKey - Chave do template (BOT_WELCOME, etc.)
   * @param variables - Variáveis para substituição
   */
  async getTemplate(
    workspaceId: string, 
    templateKey: string, 
    variables: TemplateVariables
  ): Promise<string> {
    try {
      // Buscar template do banco
      const template = await this.prisma.chatbotTemplate.findFirst({
        where: { 
          workspaceId, 
          key: templateKey,
          isActive: true,
        },
        select: { content: true },
      });

      if (template?.content) {
        // Template encontrado no banco - usa ele
        this.logger.debug(`[${workspaceId}] Template ${templateKey}: usando do banco`);
        return renderTemplate(template.content, variables);
      }

      // Template NÃO encontrado no banco - usa default e loga aviso
      const defaultTemplate = BOT_TEMPLATE_DEFAULTS[templateKey];
      if (defaultTemplate) {
        this.logger.warn(`[${workspaceId}] Template ${templateKey} não configurado, usando padrão`);
        return renderTemplate(defaultTemplate.content, variables);
      }

      // Nenhum template encontrado
      this.logger.error(`[${workspaceId}] Template ${templateKey} não existe nem no banco nem nos defaults!`);
      return `[Erro: Template ${templateKey} não configurado]`;
    } catch (err) {
      this.logger.error(`[${workspaceId}] Erro ao buscar template ${templateKey}: ${err}`);
      // Em caso de erro, tenta usar default
      const defaultTemplate = BOT_TEMPLATE_DEFAULTS[templateKey];
      return defaultTemplate 
        ? renderTemplate(defaultTemplate.content, variables)
        : `[Erro: Template ${templateKey} indisponível]`;
    }
  }

  /**
   * Gera mensagem com link de agendamento
   * Rota pública: /{slug}/booking
   */
  private async getBookingLinkMessage(workspaceId: string, variables: TemplateVariables): Promise<string> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });

    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    // Rota correta: /{slug}/booking (ex: https://belapro.app/salao-da-maria/booking)
    const bookingLink = `${baseUrl}/${workspace?.slug || workspaceId}/booking`;

    // Adicionar bookingLink às variáveis
    const vars = { ...variables, bookingLink };
    
    return this.getTemplate(workspaceId, BotTemplateKey.BOOKING_LINK, vars);
  }

  /**
   * Busca agendamentos do cliente (consulta REAL ao banco)
   * 
   * IMPORTANTE: Normalização de telefone
   * - WhatsApp envia: 556699880161 (sem @c.us, já removido)
   * - Banco pode ter: 556699880161, 6699880161, +556699880161, etc.
   * - Tenta múltiplos formatos para encontrar o cliente
   */
  private async getMyAppointmentsMessage(context: BotMessageContext): Promise<string> {
    // Normalizar telefone - remover tudo que não é dígito
    const phone = context.clientPhone.replace(/\D/g, '');
    
    // Criar variações para busca
    // WhatsApp BR sempre vem com 55 + DDD + número
    const phoneWithDDI = phone.startsWith('55') ? phone : `55${phone}`;
    const phoneWithoutDDI = phone.startsWith('55') ? phone.substring(2) : phone;
    const phoneWithPlus = `+${phoneWithDDI}`;

    this.logger.log(`[${context.workspaceId}] Buscando cliente com telefone: ${phoneWithDDI} ou ${phoneWithoutDDI} ou ${phoneWithPlus}`);

    // Buscar cliente tentando múltiplos formatos
    const client = await this.prisma.client.findFirst({
      where: {
        workspaceId: context.workspaceId,
        OR: [
          { phoneE164: phoneWithDDI },
          { phoneE164: phoneWithoutDDI },
          { phoneE164: phoneWithPlus },
          // Busca parcial - contém o número sem DDI
          { phoneE164: { contains: phoneWithoutDDI } },
        ],
      },
      select: { id: true, name: true, phoneE164: true },
    });

    if (!client) {
      // Log para debug - listar clientes do workspace para ver o formato
      const allClients = await this.prisma.client.findMany({
        where: { workspaceId: context.workspaceId },
        select: { phoneE164: true, name: true },
        take: 5,
      });
      this.logger.warn(`[${context.workspaceId}] Cliente não encontrado. Clientes existentes: ${JSON.stringify(allClients.map(c => c.phoneE164))}`);
      
      return this.getTemplate(context.workspaceId, BotTemplateKey.NO_APPOINTMENTS, {
        clientName: context.clientName,
      });
    }

    this.logger.log(`[${context.workspaceId}] Cliente encontrado: ${client.id} (${client.name}) - telefone no banco: ${client.phoneE164}`);

    // Buscar próximos agendamentos ATIVOS
    const now = new Date();
    const appointments = await this.prisma.appointment.findMany({
      where: {
        clientId: client.id,
        workspaceId: context.workspaceId,
        startAt: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      orderBy: { startAt: 'asc' },
      take: 3,
      include: {
        services: { 
          include: { 
            service: { select: { name: true } } 
          } 
        },
      },
    });

    this.logger.log(`[${context.workspaceId}] Agendamentos encontrados: ${appointments.length}`);

    if (appointments.length === 0) {
      return this.getTemplate(context.workspaceId, BotTemplateKey.NO_APPOINTMENTS, {
        clientName: context.clientName,
      });
    }

    // Formatar lista de agendamentos com dados REAIS
    // IMPORTANTE: Usar timezone do Brasil (America/Sao_Paulo)
    const brazilTz = 'America/Sao_Paulo';
    const appointmentsList = appointments.map((apt, i) => {
      const date = apt.startAt.toLocaleDateString('pt-BR', {
        timeZone: brazilTz,
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      });
      const time = apt.startAt.toLocaleTimeString('pt-BR', { 
        timeZone: brazilTz,
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
      });
      const services = apt.services.map(s => s.service?.name).filter(Boolean).join(', ') || 'Serviço';
      const statusEmoji = apt.status === 'CONFIRMED' ? '✅' : '⏳';
      
      return `${statusEmoji} ${i + 1}. ${services}\n   📅 ${date} às ${time}`;
    }).join('\n\n');

    // Usar template do banco para a lista
    return this.getTemplate(context.workspaceId, BotTemplateKey.APPOINTMENTS_LIST, {
      clientName: client.name || context.clientName,
      appointmentsList,
    });
  }

  // ==========================================================================
  // GERENCIAMENTO DE TEMPLATES
  // ==========================================================================

  /**
   * Cria todos os templates padrão para um workspace
   * Chamado quando o admin conecta o bot pela primeira vez
   * Também pode ser chamado para garantir que todos os templates existam
   * 
   * @param workspaceId - ID do workspace
   * @returns Número de templates criados
   */
  async createDefaultTemplates(workspaceId: string): Promise<number> {
    this.logger.log(`[${workspaceId}] Verificando/criando templates do bot (total: ${Object.keys(BOT_TEMPLATE_DEFAULTS).length})...`);
    
    let created = 0;
    
    for (const [key, meta] of Object.entries(BOT_TEMPLATE_DEFAULTS)) {
      try {
        // Verifica se já existe
        const existing = await this.prisma.chatbotTemplate.findUnique({
          where: { workspaceId_key: { workspaceId, key } },
        });
        
        if (!existing) {
          await this.prisma.chatbotTemplate.create({
            data: {
              workspaceId,
              key,
              content: meta.content,
              isActive: true,
            },
          });
          created++;
          this.logger.log(`[${workspaceId}] Template ${key} criado`);
        }
      } catch (err) {
        this.logger.error(`[${workspaceId}] Erro ao criar template ${key}: ${err}`);
      }
    }
    
    if (created > 0) {
      this.logger.log(`[${workspaceId}] ${created} novos templates criados`);
    } else {
      this.logger.log(`[${workspaceId}] Todos os templates já existem`);
    }
    
    return created;
  }

  /**
   * Verifica se o workspace tem templates configurados
   */
  async hasTemplatesConfigured(workspaceId: string): Promise<boolean> {
    const count = await this.prisma.chatbotTemplate.count({
      where: { workspaceId, isActive: true },
    });
    return count >= Object.keys(BOT_TEMPLATE_DEFAULTS).length;
  }

  /**
   * Envia mensagem proativa (para notificações automáticas do sistema)
   * 
   * IMPORTANTE: Usa ChatbotTemplate (tabela do bot), NÃO MessageTemplate
   * Isso garante que as notificações funcionem com os templates configurados na página do Bot
   * 
   * Mapeamento de eventos:
   * - APPOINTMENT_CONFIRMED -> BOT_NOTIFY_CONFIRMED
   * - APPOINTMENT_CREATED -> BOT_NOTIFY_CREATED
   * - APPOINTMENT_CANCELLED -> BOT_NOTIFY_CANCELLED
   * - APPOINTMENT_REMINDER_* -> BOT_NOTIFY_REMINDER
   */
  async sendProactiveMessage(
    workspaceId: string,
    to: string,
    eventType: string,
    variables: TemplateVariables
  ): Promise<boolean> {
    this.logger.log(`[${workspaceId}] sendProactiveMessage: ${eventType} para ${to}`);

    // Mapear evento para template do bot
    const templateKey = this.mapEventToTemplate(eventType);
    this.logger.log(`[${workspaceId}] Mapeado para template: ${templateKey}`);

    // Usar o mesmo sistema de templates do bot (ChatbotTemplate)
    const message = await this.getTemplate(workspaceId, templateKey, variables);
    
    if (!message) {
      this.logger.error(`[${workspaceId}] Não foi possível obter template ${templateKey}`);
      return false;
    }

    this.logger.log(`[${workspaceId}] Enviando notificação: ${message.substring(0, 50)}...`);
    
    return this.sessionManager.sendMessage(workspaceId, to, message);
  }

  /**
   * Mapeia evento de agendamento para template do bot
   */
  private mapEventToTemplate(eventType: string): string {
    const mapping: Record<string, string> = {
      'APPOINTMENT_CONFIRMED': BotTemplateKey.NOTIFY_APPOINTMENT_CONFIRMED,
      'APPOINTMENT_CREATED': BotTemplateKey.NOTIFY_APPOINTMENT_CREATED,
      'APPOINTMENT_CANCELLED': BotTemplateKey.NOTIFY_APPOINTMENT_CANCELLED,
      'APPOINTMENT_REMINDER_24H': BotTemplateKey.NOTIFY_APPOINTMENT_REMINDER,
      'APPOINTMENT_REMINDER_2H': BotTemplateKey.NOTIFY_APPOINTMENT_REMINDER,
      'APPOINTMENT_COMPLETED': BotTemplateKey.NOTIFY_APPOINTMENT_CONFIRMED, // Usa confirmado como fallback
    };
    
    return mapping[eventType] || BotTemplateKey.NOTIFY_APPOINTMENT_CONFIRMED;
  }
}
