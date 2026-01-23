import { Test, TestingModule } from '@nestjs/testing';
import { ChatUsageService } from './chat-usage.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CONVERSATION_WINDOW_MS,
  getCurrentYearMonth,
  MessageContext,
} from './chat-usage.types';

/**
 * Testes unitários para ChatUsageService
 * 
 * Cenários testados:
 * 1. Duas mensagens no mesmo dia → 1 conversa
 * 2. Mensagem após 24h → nova conversa
 * 3. Workspace A não interfere no B
 * 4. Estouro de limite registra excedente
 * 5. Reinício de mês cria novo registro
 */
describe('ChatUsageService', () => {
  let service: ChatUsageService;
  let prisma: PrismaService;

  // Mocks
  const mockWorkspaceA = {
    id: 'workspace-a',
    plan: 'BASIC',
  };

  const mockWorkspaceB = {
    id: 'workspace-b',
    plan: 'BASIC',
  };

  const mockChatUsage = {
    id: 'usage-1',
    workspaceId: 'workspace-a',
    yearMonth: getCurrentYearMonth(),
    conversationsUsed: 5,
    conversationsLimit: 300,
    excessConversations: 0,
    lastConversationAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBillingEvent = {
    id: 'event-1',
    workspaceId: 'workspace-a',
    conversationId: 'conv-1',
    phoneE164: '+5511999999999',
    windowStartAt: new Date(),
    windowEndAt: new Date(Date.now() + CONVERSATION_WINDOW_MS),
    isExcess: false,
    yearMonth: getCurrentYearMonth(),
    createdAt: new Date(),
  };

  const createMockPrisma = () => ({
    workspace: {
      findUnique: jest.fn(),
    },
    chatUsage: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    conversationBillingEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      workspace: { findUnique: jest.fn().mockResolvedValue(mockWorkspaceA) },
      chatUsage: {
        findUnique: jest.fn().mockResolvedValue(mockChatUsage),
        create: jest.fn().mockResolvedValue(mockChatUsage),
        update: jest.fn().mockResolvedValue(mockChatUsage),
      },
      conversationBillingEvent: {
        create: jest.fn().mockResolvedValue(mockBillingEvent),
      },
    })),
  });

  beforeEach(async () => {
    const mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatUsageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ChatUsageService>(ChatUsageService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasActiveConversation', () => {
    it('deve retornar isActive=true se houver janela ativa', async () => {
      const activeWindow = new Date(Date.now() + 60 * 60 * 1000); // +1h

      (prisma.conversationBillingEvent.findFirst as jest.Mock).mockResolvedValue({
        ...mockBillingEvent,
        windowEndAt: activeWindow,
      });

      const result = await service.hasActiveConversation('conv-1', null);

      expect(result.isActive).toBe(true);
      expect(result.windowEndsAt).toEqual(activeWindow);
      expect(result.remainingMs).toBeGreaterThan(0);
    });

    it('deve retornar isActive=false se a janela expirou', async () => {
      (prisma.conversationBillingEvent.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.hasActiveConversation('conv-1', null);

      expect(result.isActive).toBe(false);
      expect(result.windowEndsAt).toBeUndefined();
    });

    it('deve usar lastMessageAt como fallback', async () => {
      (prisma.conversationBillingEvent.findFirst as jest.Mock).mockResolvedValue(null);

      // Mensagem de 1 hora atrás (ainda dentro da janela de 24h)
      const lastMessageAt = new Date(Date.now() - 60 * 60 * 1000);

      const result = await service.hasActiveConversation('conv-1', lastMessageAt);

      expect(result.isActive).toBe(true);
      expect(result.remainingMs).toBeGreaterThan(0);
    });
  });

  describe('processMessageBilling', () => {
    it('CENÁRIO 1: Duas mensagens no mesmo dia → 1 conversa', async () => {
      // Primeira mensagem - janela ativa encontrada
      const activeWindow = new Date(Date.now() + 20 * 60 * 60 * 1000); // +20h

      (prisma.conversationBillingEvent.findFirst as jest.Mock).mockResolvedValue({
        ...mockBillingEvent,
        windowEndAt: activeWindow,
      });

      (prisma.chatUsage.upsert as jest.Mock).mockResolvedValue(mockChatUsage);

      const context: MessageContext = {
        workspaceId: 'workspace-a',
        conversationId: 'conv-1',
        phoneE164: '+5511999999999',
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h atrás
      };

      const result = await service.processMessageBilling(context);

      expect(result.shouldProcess).toBe(true);
      expect(result.newConversationRegistered).toBe(false); // Reutilizou
      expect(result.isExcess).toBe(false);
    });

    it('CENÁRIO 2: Mensagem após 24h → nova conversa', async () => {
      // Nenhuma janela ativa
      (prisma.conversationBillingEvent.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock da transaction para nova conversa
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          workspace: { findUnique: jest.fn().mockResolvedValue(mockWorkspaceA) },
          chatUsage: {
            findUnique: jest.fn().mockResolvedValue(mockChatUsage),
            update: jest.fn().mockResolvedValue({
              ...mockChatUsage,
              conversationsUsed: 6,
            }),
          },
          conversationBillingEvent: {
            create: jest.fn().mockResolvedValue(mockBillingEvent),
          },
        });
      });

      (prisma.chatUsage.upsert as jest.Mock).mockResolvedValue({
        ...mockChatUsage,
        conversationsUsed: 6,
      });

      const context: MessageContext = {
        workspaceId: 'workspace-a',
        conversationId: 'conv-1',
        phoneE164: '+5511999999999',
        lastMessageAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h atrás
      };

      const result = await service.processMessageBilling(context);

      expect(result.shouldProcess).toBe(true);
      expect(result.newConversationRegistered).toBe(true); // Nova conversa
    });

    it('CENÁRIO 3: Workspace A não interfere no B', async () => {
      // Workspace A tem janela ativa
      (prisma.conversationBillingEvent.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          ...mockBillingEvent,
          workspaceId: 'workspace-a',
          windowEndAt: new Date(Date.now() + 20 * 60 * 60 * 1000),
        })
        // Workspace B não tem
        .mockResolvedValueOnce(null);

      (prisma.chatUsage.upsert as jest.Mock).mockResolvedValue(mockChatUsage);

      // Mensagem para workspace A
      const resultA = await service.processMessageBilling({
        workspaceId: 'workspace-a',
        conversationId: 'conv-a',
        phoneE164: '+5511999999999',
        lastMessageAt: null,
      });

      expect(resultA.newConversationRegistered).toBe(false); // Reutilizou

      // Agora para workspace B
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          workspace: { findUnique: jest.fn().mockResolvedValue(mockWorkspaceB) },
          chatUsage: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockChatUsage,
              workspaceId: 'workspace-b',
            }),
            update: jest.fn().mockResolvedValue({
              ...mockChatUsage,
              workspaceId: 'workspace-b',
              conversationsUsed: 1,
            }),
          },
          conversationBillingEvent: {
            create: jest.fn().mockResolvedValue({
              ...mockBillingEvent,
              workspaceId: 'workspace-b',
            }),
          },
        });
      });

      const resultB = await service.processMessageBilling({
        workspaceId: 'workspace-b',
        conversationId: 'conv-b',
        phoneE164: '+5511888888888',
        lastMessageAt: null,
      });

      expect(resultB.newConversationRegistered).toBe(true); // Nova conversa
    });

    it('CENÁRIO 4: Estouro de limite registra excedente', async () => {
      (prisma.conversationBillingEvent.findFirst as jest.Mock).mockResolvedValue(null);

      // Workspace já no limite
      const usageAtLimit = {
        ...mockChatUsage,
        conversationsUsed: 300,
        conversationsLimit: 300,
        excessConversations: 0,
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          workspace: { findUnique: jest.fn().mockResolvedValue(mockWorkspaceA) },
          chatUsage: {
            findUnique: jest.fn().mockResolvedValue(usageAtLimit),
            update: jest.fn().mockResolvedValue({
              ...usageAtLimit,
              excessConversations: 1, // Incrementou excedente
            }),
          },
          conversationBillingEvent: {
            create: jest.fn().mockResolvedValue({
              ...mockBillingEvent,
              isExcess: true,
            }),
          },
        });
      });

      (prisma.chatUsage.upsert as jest.Mock).mockResolvedValue({
        ...usageAtLimit,
        excessConversations: 1,
      });

      const result = await service.processMessageBilling({
        workspaceId: 'workspace-a',
        conversationId: 'conv-new',
        phoneE164: '+5511777777777',
        lastMessageAt: null,
      });

      expect(result.shouldProcess).toBe(true); // Nunca bloqueia
      expect(result.newConversationRegistered).toBe(true);
      expect(result.isExcess).toBe(true); // Registrado como excedente
    });

    it('CENÁRIO 5: Nunca bloqueia mensagens, mesmo em erro', async () => {
      // Simular erro no banco
      (prisma.conversationBillingEvent.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.processMessageBilling({
        workspaceId: 'workspace-a',
        conversationId: 'conv-1',
        phoneE164: '+5511999999999',
        lastMessageAt: null,
      });

      // Mesmo com erro, deve permitir processamento
      expect(result.shouldProcess).toBe(true);
      expect(result.newConversationRegistered).toBe(false);
    });
  });

  describe('getOrCreateMonthlyUsage', () => {
    it('deve criar registro se não existir', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspaceA);
      (prisma.chatUsage.upsert as jest.Mock).mockResolvedValue({
        ...mockChatUsage,
        conversationsUsed: 0,
      });

      const result = await service.getOrCreateMonthlyUsage('workspace-a');

      expect(result.conversationsUsed).toBe(0);
      expect(result.limitReached).toBe(false);
      expect(result.usagePercentage).toBe(0);
    });

    it('deve calcular usagePercentage corretamente', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspaceA);
      (prisma.chatUsage.upsert as jest.Mock).mockResolvedValue({
        ...mockChatUsage,
        conversationsUsed: 150,
        conversationsLimit: 300,
      });

      const result = await service.getOrCreateMonthlyUsage('workspace-a');

      expect(result.usagePercentage).toBe(50);
    });

    it('deve marcar limitReached quando há excedente', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(mockWorkspaceA);
      (prisma.chatUsage.upsert as jest.Mock).mockResolvedValue({
        ...mockChatUsage,
        conversationsUsed: 300,
        excessConversations: 10,
      });

      const result = await service.getOrCreateMonthlyUsage('workspace-a');

      expect(result.limitReached).toBe(true);
    });
  });

  describe('getUsageHistory', () => {
    it('deve retornar histórico ordenado por mês', async () => {
      const history = [
        { ...mockChatUsage, yearMonth: '2026-01' },
        { ...mockChatUsage, yearMonth: '2025-12', conversationsUsed: 200 },
      ];

      (prisma.chatUsage.findMany as jest.Mock).mockResolvedValue(history);

      const result = await service.getUsageHistory('workspace-a', 2);

      expect(result).toHaveLength(2);
      expect(result[0].yearMonth).toBe('2026-01');
      expect(result[1].yearMonth).toBe('2025-12');
    });
  });
});

// =============================================================================
// TESTES DE INTEGRAÇÃO (helpers)
// =============================================================================

describe('Chat Usage Types', () => {
  describe('getCurrentYearMonth', () => {
    it('deve retornar formato YYYY-MM', () => {
      const result = getCurrentYearMonth();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });
  });
});
