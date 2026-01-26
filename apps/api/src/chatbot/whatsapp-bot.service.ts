/**
 * WhatsApp Bot Service
 * 
 * Serviço responsável por:
 * - Processar mensagens recebidas
 * - Buscar templates do sistema
 * - Responder usando templates configurados
 * 
 * NÃO contém mensagens hardcoded - tudo vem do MessageTemplatesService.
 * 
 * @module chatbot
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppSessionManager } from './whatsapp-session.manager';
import { IncomingWhatsAppMessage, BotMessageContext, TemplateVariables } from './whatsapp.types';
import { renderTemplate } from '../message-templates/template-renderer';

// Eventos de bot (diferentes dos eventos de agendamento)
export enum BotTemplateType {
  WELCOME = 'BOT_WELCOME',           // Mensagem de boas-vindas
  MENU = 'BOT_MENU',                 // Menu principal
  HELP = 'BOT_HELP',                 // Ajuda
  UNKNOWN_COMMAND = 'BOT_UNKNOWN',   // Comando não reconhecido
  HUMAN_HANDOFF = 'BOT_HUMAN',       // Transferência para humano
}

// Templates padrão (fallback se não existir no banco)
const DEFAULT_BOT_TEMPLATES: Record<BotTemplateType, string> = {
  [BotTemplateType.WELCOME]: 
    'Olá {{clientName}}! 👋\n\nBem-vindo(a) à {{workspaceName}}!\n\nDigite:\n1️⃣ Agendar\n2️⃣ Meus agendamentos\n3️⃣ Falar com atendente',
  [BotTemplateType.MENU]: 
    'Como posso ajudar?\n\n1️⃣ Agendar\n2️⃣ Meus agendamentos\n3️⃣ Falar com atendente',
  [BotTemplateType.HELP]: 
    'Precisa de ajuda? 🤔\n\nDigite o número da opção:\n1 - Agendar um serviço\n2 - Ver seus agendamentos\n3 - Falar com um atendente',
  [BotTemplateType.UNKNOWN_COMMAND]: 
    'Desculpe, não entendi. 😅\n\nDigite:\n1️⃣ Agendar\n2️⃣ Meus agendamentos\n3️⃣ Falar com atendente',
  [BotTemplateType.HUMAN_HANDOFF]: 
    'Certo! Um atendente vai falar com você em breve. ⏳\n\nAguarde, por favor!',
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
    const { workspaceId, from, fromName, body } = message;

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
      await this.sessionManager.sendMessage(workspaceId, from, response);
    }
  }

  /**
   * Processa comando do usuário e retorna resposta
   */
  private async processCommand(context: BotMessageContext, variables: TemplateVariables): Promise<string | null> {
    const { messageText, workspaceId } = context;

    // Primeiro contato ou saudação
    if (this.isGreeting(messageText)) {
      return this.getTemplateMessage(workspaceId, BotTemplateType.WELCOME, variables);
    }

    // Menu
    if (messageText === 'menu' || messageText === '0') {
      return this.getTemplateMessage(workspaceId, BotTemplateType.MENU, variables);
    }

    // Ajuda
    if (messageText === 'ajuda' || messageText === 'help' || messageText === '?') {
      return this.getTemplateMessage(workspaceId, BotTemplateType.HELP, variables);
    }

    // Agendar
    if (messageText === '1' || messageText.includes('agendar')) {
      // TODO: Implementar fluxo de agendamento
      // Por enquanto, retorna mensagem simples
      return this.getBookingLinkMessage(workspaceId, variables);
    }

    // Meus agendamentos
    if (messageText === '2' || messageText.includes('agendamento')) {
      return this.getMyAppointmentsMessage(context);
    }

    // Falar com atendente
    if (messageText === '3' || messageText.includes('atendente') || messageText.includes('humano')) {
      return this.getTemplateMessage(workspaceId, BotTemplateType.HUMAN_HANDOFF, variables);
    }

    // Comando não reconhecido
    return this.getTemplateMessage(workspaceId, BotTemplateType.UNKNOWN_COMMAND, variables);
  }

  /**
   * Verifica se é uma saudação
   */
  private isGreeting(text: string): boolean {
    const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hi', 'hello', 'opa', 'eae', 'e aí'];
    return greetings.some(g => text.startsWith(g) || text === g);
  }

  /**
   * Busca template do banco ou usa fallback
   */
  async getTemplateMessage(
    workspaceId: string, 
    templateType: BotTemplateType, 
    variables: TemplateVariables
  ): Promise<string> {
    // Bot templates usam fallback direto - templates customizados podem ser 
    // implementados futuramente em tabela separada ou via ChatbotTemplate
    // Por enquanto, usa os defaults que são editáveis no código
    const templateText = DEFAULT_BOT_TEMPLATES[templateType];
    return renderTemplate(templateText, variables);
  }

  /**
   * Gera mensagem com link de agendamento
   */
  private async getBookingLinkMessage(workspaceId: string, variables: TemplateVariables): Promise<string> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });

    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    const bookingLink = `${baseUrl}/agendar/${workspace?.slug || workspaceId}`;

    const message = `📅 Para agendar, acesse o link:\n\n${bookingLink}\n\nÉ rápido e fácil! ✨`;
    
    return renderTemplate(message, variables);
  }

  /**
   * Busca agendamentos do cliente
   */
  private async getMyAppointmentsMessage(context: BotMessageContext): Promise<string> {
    // Normalizar telefone para formato E.164
    const phone = context.clientPhone.replace(/\D/g, '');
    const phoneE164 = phone.startsWith('55') ? `+${phone}` : `+55${phone}`;

    // Buscar cliente pelo phoneE164
    const client = await this.prisma.client.findFirst({
      where: {
        workspaceId: context.workspaceId,
        phoneE164,
      },
      select: { id: true },
    });

    if (!client) {
      return 'Não encontrei agendamentos para este número. 📋\n\nDigite 1 para fazer um novo agendamento!';
    }

    // Buscar próximos agendamentos
    const appointments = await this.prisma.appointment.findMany({
      where: {
        clientId: client.id,
        startAt: { gte: new Date() },
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

    if (appointments.length === 0) {
      return 'Você não tem agendamentos futuros. 📅\n\nDigite 1 para agendar!';
    }

    // Formatar lista
    const list = appointments.map((apt, i) => {
      const date = apt.startAt.toLocaleDateString('pt-BR');
      const time = apt.startAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const serviceName = apt.services[0]?.service?.name || 'Serviço';
      return `${i + 1}. ${serviceName}\n   📅 ${date} às ${time}`;
    }).join('\n\n');

    return `📋 Seus próximos agendamentos:\n\n${list}\n\nDigite 0 para voltar ao menu.`;
  }

  /**
   * Envia mensagem proativa (para notificações do sistema)
   * Usa templates do MessageTemplatesModule
   */
  async sendProactiveMessage(
    workspaceId: string,
    to: string,
    templateType: string,
    variables: TemplateVariables
  ): Promise<boolean> {
    // Buscar template usando raw query para aceitar qualquer eventType string
    const templates = await this.prisma.$queryRaw<Array<{ message: string }>>`
      SELECT message FROM "MessageTemplate" 
      WHERE "workspaceId" = ${workspaceId} 
        AND "eventType" = ${templateType}
        AND "enabled" = true
      LIMIT 1
    `;

    if (!templates || templates.length === 0) {
      this.logger.warn(`[${workspaceId}] Template ${templateType} não encontrado ou desabilitado`);
      return false;
    }

    const message = renderTemplate(templates[0].message, variables);
    
    return this.sessionManager.sendMessage(workspaceId, to, message);
  }
}
