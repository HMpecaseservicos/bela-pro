/**
 * WhatsApp Session Manager
 * 
 * Gerencia múltiplas sessões de WhatsApp, uma por workspace.
 * Usa whatsapp-web.js para conexão via QR Code (WhatsApp Web).
 * 
 * Responsabilidades:
 * - Criar/destruir sessões por workspace
 * - Gerar QR Codes
 * - Manter estado de conexão
 * - Isolar sessões completamente entre workspaces
 * 
 * Compatível com Railway (Node.js gerenciado):
 * - Puppeteer configurado para ambientes sem GUI
 * - Usa PUPPETEER_EXECUTABLE_PATH se disponível
 * - Flags de segurança para containers/VMs
 * 
 * @module chatbot
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { 
  WhatsAppSessionState, 
  WhatsAppSessionInfo,
  IncomingWhatsAppMessage,
} from './whatsapp.types';

// Callback para mensagens recebidas
export type MessageCallback = (message: IncomingWhatsAppMessage) => Promise<void>;

/**
 * Detecta o caminho do Chromium/Chrome no sistema.
 * Tenta múltiplos caminhos conhecidos em diferentes ambientes.
 */
function findChromiumExecutable(): string | undefined {
  // Se definido via env var, usa diretamente
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  // Caminhos conhecidos para Chromium/Chrome
  const knownPaths = [
    // Nix (Railway)
    '/nix/var/nix/profiles/default/bin/chromium',
    // Nix alternativo
    (process.env.HOME || '') + '/.nix-profile/bin/chromium',
    // Ubuntu/Debian apt
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    // Snap
    '/snap/bin/chromium',
    // MacOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];

  for (const chromePath of knownPaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Tenta via 'which' como último recurso
  try {
    const whichResult = execSync('which chromium || which chromium-browser || which google-chrome || true', { encoding: 'utf-8' }).trim();
    if (whichResult && fs.existsSync(whichResult)) {
      return whichResult;
    }
  } catch {
    // Ignora erro do which
  }

  // Não encontrou - deixa puppeteer tentar encontrar
  return undefined;
}

/**
 * Configuração do Puppeteer para ambientes gerenciados (Railway, Heroku, etc.)
 * - headless: true (sem GUI)
 * - executablePath: detecta automaticamente o Chromium
 * - args: flags obrigatórias para ambientes sem privilégios root
 */
function getPuppeteerConfig() {
  const executablePath = findChromiumExecutable();
  
  const logger = new Logger('PuppeteerConfig');
  if (executablePath) {
    logger.log(`Chromium encontrado: ${executablePath}`);
  } else {
    logger.warn('Chromium não encontrado em caminhos conhecidos, tentando padrão do Puppeteer');
  }
  
  return {
    headless: true,
    executablePath: executablePath || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--single-process', // Importante para Railway
      '--disable-extensions',
    ],
  };
}

interface SessionData {
  client: Client;
  state: WhatsAppSessionState;
  qrCode: string | null;
  connectedPhone: string | null;
  connectedAt: Date | null;
  lastError: string | null;
}

@Injectable()
export class WhatsAppSessionManager implements OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppSessionManager.name);
  
  // Map de sessões: workspaceId -> SessionData
  private sessions = new Map<string, SessionData>();
  
  // Callback global para mensagens (set pelo BotService)
  private messageCallback: MessageCallback | null = null;
  
  // Pasta base para armazenar sessões
  private readonly sessionsDir = path.join(process.cwd(), '.whatsapp-sessions');

  constructor() {
    // Garantir que a pasta de sessões existe
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Cleanup ao desligar o módulo
   */
  async onModuleDestroy() {
    this.logger.log('Encerrando todas as sessões WhatsApp...');
    
    const destroyPromises = Array.from(this.sessions.keys()).map(workspaceId => 
      this.destroySession(workspaceId).catch(() => {})
    );
    
    await Promise.all(destroyPromises);
  }

  /**
   * Registra callback para mensagens recebidas
   */
  setMessageCallback(callback: MessageCallback): void {
    this.messageCallback = callback;
  }

  /**
   * Retorna informações da sessão
   */
  getSessionInfo(workspaceId: string): WhatsAppSessionInfo {
    const session = this.sessions.get(workspaceId);
    
    if (!session) {
      return {
        workspaceId,
        state: WhatsAppSessionState.DISCONNECTED,
        qrCode: null,
        connectedPhone: null,
        connectedAt: null,
        lastError: null,
      };
    }

    return {
      workspaceId,
      state: session.state,
      qrCode: session.qrCode,
      connectedPhone: session.connectedPhone,
      connectedAt: session.connectedAt,
      lastError: session.lastError,
    };
  }

  /**
   * Inicia uma nova sessão para o workspace
   * Se já existir uma sessão conectada, retorna ela
   */
  async startSession(workspaceId: string): Promise<WhatsAppSessionInfo> {
    const existing = this.sessions.get(workspaceId);
    
    // Se já está conectado ou conectando, retorna
    if (existing && (
      existing.state === WhatsAppSessionState.CONNECTED ||
      existing.state === WhatsAppSessionState.CONNECTING ||
      existing.state === WhatsAppSessionState.QR_PENDING
    )) {
      return this.getSessionInfo(workspaceId);
    }

    // Limpar sessão anterior se existir
    if (existing) {
      await this.destroySession(workspaceId);
    }

    this.logger.log(`[${workspaceId}] Iniciando nova sessão WhatsApp...`);

    // Criar cliente com autenticação local (persistente)
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: workspaceId,
        dataPath: this.sessionsDir,
      }),
      puppeteer: getPuppeteerConfig(),
    });

    // Criar registro da sessão
    const sessionData: SessionData = {
      client,
      state: WhatsAppSessionState.CONNECTING,
      qrCode: null,
      connectedPhone: null,
      connectedAt: null,
      lastError: null,
    };

    this.sessions.set(workspaceId, sessionData);

    // Configurar event handlers
    this.setupClientEvents(workspaceId, client, sessionData);

    // Inicializar cliente (não bloqueia)
    client.initialize().catch(err => {
      this.logger.error(`[${workspaceId}] Erro ao inicializar: ${err.message}`);
      sessionData.state = WhatsAppSessionState.AUTH_FAILURE;
      sessionData.lastError = err.message;
    });

    return this.getSessionInfo(workspaceId);
  }

  /**
   * Configura os event handlers do cliente
   */
  private setupClientEvents(workspaceId: string, client: Client, sessionData: SessionData): void {
    // QR Code gerado
    client.on('qr', (qr: string) => {
      this.logger.log(`[${workspaceId}] QR Code gerado`);
      sessionData.state = WhatsAppSessionState.QR_PENDING;
      sessionData.qrCode = qr;
    });

    // Autenticação bem sucedida
    client.on('authenticated', () => {
      this.logger.log(`[${workspaceId}] Autenticado com sucesso`);
      sessionData.qrCode = null;
    });

    // Pronto para usar
    client.on('ready', async () => {
      this.logger.log(`[${workspaceId}] WhatsApp conectado e pronto`);
      sessionData.state = WhatsAppSessionState.CONNECTED;
      sessionData.qrCode = null;
      sessionData.connectedAt = new Date();
      
      // Obter número conectado
      try {
        const info = client.info;
        if (info?.wid?.user) {
          sessionData.connectedPhone = `+${info.wid.user}`;
        }
      } catch {
        // Ignora erro ao obter info
      }
    });

    // Desconectado
    client.on('disconnected', (reason: string) => {
      this.logger.warn(`[${workspaceId}] Desconectado: ${reason}`);
      sessionData.state = WhatsAppSessionState.DISCONNECTED;
      sessionData.connectedPhone = null;
      sessionData.connectedAt = null;
      sessionData.lastError = reason;
    });

    // Falha na autenticação
    client.on('auth_failure', (msg: string) => {
      this.logger.error(`[${workspaceId}] Falha na autenticação: ${msg}`);
      sessionData.state = WhatsAppSessionState.AUTH_FAILURE;
      sessionData.lastError = msg;
      sessionData.qrCode = null;
    });

    // Mensagem recebida
    client.on('message', async (msg: Message) => {
      // Ignorar mensagens de grupo ou próprias
      if (msg.from.includes('@g.us') || msg.fromMe) {
        return;
      }

      // Obter nome do contato
      let fromName = '';
      try {
        const contact = await msg.getContact();
        fromName = contact?.pushname || contact?.name || '';
      } catch {
        // Ignora erro ao obter contato
      }

      // Converter para formato interno
      const incoming: IncomingWhatsAppMessage = {
        workspaceId,
        from: msg.from.replace('@c.us', ''),
        fromName,
        body: msg.body || '',
        timestamp: new Date(msg.timestamp * 1000),
        messageId: msg.id._serialized,
      };

      // Chamar callback se registrado
      if (this.messageCallback) {
        try {
          await this.messageCallback(incoming);
        } catch (err) {
          this.logger.error(`[${workspaceId}] Erro no callback de mensagem: ${err}`);
        }
      }
    });
  }

  /**
   * Envia mensagem de texto
   */
  async sendMessage(workspaceId: string, to: string, text: string): Promise<boolean> {
    const session = this.sessions.get(workspaceId);
    
    if (!session || session.state !== WhatsAppSessionState.CONNECTED) {
      this.logger.warn(`[${workspaceId}] Tentativa de enviar mensagem sem sessão conectada`);
      return false;
    }

    try {
      // Formatar número para WhatsApp (adiciona @c.us)
      const chatId = this.formatPhoneForWhatsApp(to);
      await session.client.sendMessage(chatId, text);
      this.logger.log(`[${workspaceId}] Mensagem enviada para ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`[${workspaceId}] Erro ao enviar mensagem: ${err}`);
      return false;
    }
  }

  /**
   * Formata telefone para o formato do WhatsApp
   */
  private formatPhoneForWhatsApp(phone: string): string {
    // Remove caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove o + do início se existir
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.slice(1);
    }
    
    // Adiciona 55 se não tiver código do país
    if (!cleaned.startsWith('55') && cleaned.length <= 11) {
      cleaned = '55' + cleaned;
    }
    
    return `${cleaned}@c.us`;
  }

  /**
   * Destrói uma sessão
   */
  async destroySession(workspaceId: string): Promise<void> {
    const session = this.sessions.get(workspaceId);
    
    if (!session) {
      return;
    }

    this.logger.log(`[${workspaceId}] Destruindo sessão...`);

    try {
      await session.client.destroy();
    } catch (err) {
      this.logger.warn(`[${workspaceId}] Erro ao destruir cliente: ${err}`);
    }

    this.sessions.delete(workspaceId);
  }

  /**
   * Desconecta e remove dados da sessão
   */
  async logoutSession(workspaceId: string): Promise<void> {
    const session = this.sessions.get(workspaceId);
    
    if (!session) {
      return;
    }

    this.logger.log(`[${workspaceId}] Fazendo logout...`);

    try {
      await session.client.logout();
    } catch {
      // Ignora erro no logout
    }

    await this.destroySession(workspaceId);

    // Remover pasta de sessão
    const sessionPath = path.join(this.sessionsDir, `session-${workspaceId}`);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }

  /**
   * Verifica se workspace está conectado
   */
  isConnected(workspaceId: string): boolean {
    const session = this.sessions.get(workspaceId);
    return session?.state === WhatsAppSessionState.CONNECTED;
  }

  /**
   * Retorna todos os workspaces com sessão ativa
   */
  getActiveWorkspaces(): string[] {
    return Array.from(this.sessions.keys());
  }
}
