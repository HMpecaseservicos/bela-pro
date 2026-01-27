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
  WELCOME = 'BOT_WELCOME',           // Mensagem de boas-vindas
  MENU = 'BOT_MENU',                 // Menu principal
  HELP = 'BOT_HELP',                 // Ajuda
  UNKNOWN_COMMAND = 'BOT_UNKNOWN',   // Comando não reconhecido
  HUMAN_HANDOFF = 'BOT_HUMAN',       // Transferência para humano
  BOOKING_LINK = 'BOT_BOOKING_LINK', // Link de agendamento
  NO_APPOINTMENTS = 'BOT_NO_APPOINTMENTS', // Sem agendamentos
  APPOINTMENTS_LIST = 'BOT_APPOINTMENTS_LIST', // Lista de agendamentos
}

// Metadados dos templates (label, descrição, conteúdo padrão)
export const BOT_TEMPLATE_DEFAULTS: Record<string, { label: string; description: string; content: string }> = {
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
   * - Banco salva: 556699880161 (só dígitos, sem +)
   * - Comparação deve ser feita com mesmo formato
   */
  private async getMyAppointmentsMessage(context: BotMessageContext): Promise<string> {
    // Normalizar telefone para formato do banco (apenas dígitos)
    // WhatsApp: 556699880161 -> Banco: 556699880161
    const phone = context.clientPhone.replace(/\D/g, '');
    // Garantir DDI 55 (Brasil)
    const phoneE164 = phone.startsWith('55') ? phone : `55${phone}`;

    this.logger.log(`[${context.workspaceId}] Buscando agendamentos para telefone: ${phoneE164}`);

    // Buscar cliente pelo phoneE164
    const client = await this.prisma.client.findFirst({
      where: {
        workspaceId: context.workspaceId,
        phoneE164,
      },
      select: { id: true, name: true },
    });

    if (!client) {
      this.logger.log(`[${context.workspaceId}] Cliente não encontrado para ${phoneE164}`);
      return this.getTemplate(context.workspaceId, BotTemplateKey.NO_APPOINTMENTS, {
        clientName: context.clientName,
      });
    }

    this.logger.log(`[${context.workspaceId}] Cliente encontrado: ${client.id} (${client.name})`);

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
    const appointmentsList = appointments.map((apt, i) => {
      const date = apt.startAt.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      });
      const time = apt.startAt.toLocaleTimeString('pt-BR', { 
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
   * 
   * @param workspaceId - ID do workspace
   * @returns Número de templates criados
   */
  async createDefaultTemplates(workspaceId: string): Promise<number> {
    this.logger.log(`[${workspaceId}] Criando templates padrão do bot...`);
    
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
    
    this.logger.log(`[${workspaceId}] ${created} templates criados`);
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
   * Envia mensagem proativa (para notificações do sistema)
   * NOTA: Usa MessageTemplate (templates manuais), NÃO templates do bot
   */
  async sendProactiveMessage(
    workspaceId: string,
    to: string,
    templateType: string,
    variables: TemplateVariables
  ): Promise<boolean> {
    this.logger.log(`[${workspaceId}] sendProactiveMessage: ${templateType} para ${to}`);

    // Buscar template de MessageTemplate (templates manuais)
    const templates = await this.prisma.$queryRaw<Array<{ message: string }>>`
      SELECT message FROM "MessageTemplate" 
      WHERE "workspaceId" = ${workspaceId} 
        AND "eventType" = ${templateType}
        AND "enabled" = true
      LIMIT 1
    `;

    if (!templates || templates.length === 0) {
      this.logger.warn(`[${workspaceId}] MessageTemplate ${templateType} não encontrado ou desabilitado`);
      
      // Tentar usar mensagem padrão para APPOINTMENT_CONFIRMED
      if (templateType === 'APPOINTMENT_CONFIRMED') {
        const defaultMsg = `Olá ${variables.clientName}! ✅\n\nSeu agendamento está confirmado:\n📅 ${variables.date} às ${variables.time}\n💇 ${variables.serviceName}\n📍 ${variables.workspaceName}\n\nTe esperamos!`;
        this.logger.log(`[${workspaceId}] Usando mensagem padrão para ${templateType}`);
        return this.sessionManager.sendMessage(workspaceId, to, defaultMsg);
      }
      
      return false;
    }

    const message = renderTemplate(templates[0].message, variables);
    this.logger.log(`[${workspaceId}] Enviando mensagem proativa: ${message.substring(0, 50)}...`);
    
    return this.sessionManager.sendMessage(workspaceId, to, message);
  }
}
