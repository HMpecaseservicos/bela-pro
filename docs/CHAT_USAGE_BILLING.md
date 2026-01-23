# Chat Usage Billing - Documentação de Integração

## Visão Geral

Sistema de billing baseado em conversas para o chatbot BELA PRO, seguindo o modelo da Meta:

- **1 conversa = janela de 24 horas**
- Múltiplas mensagens dentro de 24h contam como **1 conversa**
- Limite mensal por workspace
- **Excedente é contabilizado, NUNCA bloqueado**

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                     WEBHOOK WHATSAPP                             │
│                   POST /api/v1/chatbot/webhook                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CHAT USAGE SERVICE                           │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ processMessageBilling(context)                          │   │
│   │   1. hasActiveConversation() → janela 24h ativa?        │   │
│   │   2. Se não → registerNewConversation()                 │   │
│   │   3. Retorna { shouldProcess: true, isExcess, ... }     │   │
│   └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ shouldProcess é SEMPRE true
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FSM (State Machine)                          │
│               Processa mensagem normalmente                      │
└─────────────────────────────────────────────────────────────────┘
```

## Integração no Webhook Handler

### Passo 1: Importar o serviço

```typescript
// chatbot.module.ts
import { Module } from '@nestjs/common';
import { ChatUsageModule } from '../chat-usage';

@Module({
  imports: [ChatUsageModule], // Importar o módulo
  // ...
})
export class ChatbotModule {}
```

### Passo 2: Injetar no controller/service

```typescript
// chatbot.service.ts
import { Injectable } from '@nestjs/common';
import { ChatUsageService, MessageContext } from '../chat-usage';

@Injectable()
export class ChatbotService {
  constructor(
    private readonly chatUsageService: ChatUsageService,
    // ... outros serviços
  ) {}
}
```

### Passo 3: Chamar no processamento de mensagem

```typescript
// chatbot.service.ts
async handleIncomingMessage(
  workspaceId: string,
  phoneE164: string,
  messageText: string,
) {
  // 1. Buscar ou criar conversa
  const conversation = await this.getOrCreateConversation(workspaceId, phoneE164);

  // 2. PROCESSAR BILLING (antes do FSM)
  const billingResult = await this.chatUsageService.processMessageBilling({
    workspaceId,
    conversationId: conversation.id,
    phoneE164,
    lastMessageAt: conversation.updatedAt, // Última mensagem da conversa
  });

  // Logar para observabilidade
  if (billingResult.newConversationRegistered) {
    this.logger.log(`Nova conversa registrada. Uso: ${billingResult.monthlyUsage.conversationsUsed}/${billingResult.monthlyUsage.conversationsLimit}`);
    
    if (billingResult.isExcess) {
      this.logger.warn(`⚠️ Conversa excedente! Total excedente: ${billingResult.monthlyUsage.excessConversations}`);
    }
  }

  // 3. SEMPRE processar - nunca bloquear
  // billingResult.shouldProcess é SEMPRE true
  await this.stateMachine.process(conversation, messageText);
}
```

## Fluxo de Decisão

```
                    ┌─────────────────────┐
                    │ Mensagem recebida   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Buscar último       │
                    │ billing event da    │
                    │ conversa            │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ windowEndAt > now?  │
                    └──────────┬──────────┘
                      ▼                ▼
                    [SIM]            [NÃO]
                      │                │
                      ▼                ▼
            ┌─────────────────┐ ┌─────────────────────┐
            │ REUTILIZAR      │ │ NOVA CONVERSA       │
            │ Não incrementa  │ │ Verificar limite    │
            │ contador        │ └──────────┬──────────┘
            └─────────────────┘            │
                                ┌──────────▼──────────┐
                                │ used < limit?       │
                                └──────────┬──────────┘
                                  ▼                ▼
                                [SIM]            [NÃO]
                                  │                │
                                  ▼                ▼
                        ┌─────────────┐  ┌─────────────────┐
                        │ Incrementar │  │ Incrementar     │
                        │ used++      │  │ excess++        │
                        └─────────────┘  │ isExcess=true   │
                                         └─────────────────┘
                                                   │
                                                   ▼
                                         ┌─────────────────┐
                                         │ NUNCA BLOQUEAR! │
                                         │ Processar FSM   │
                                         └─────────────────┘
```

## Endpoints de Consulta

### GET /api/v1/chat-usage/:workspaceId/current

Retorna uso do mês atual.

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "workspaceId": "workspace123",
    "yearMonth": "2026-01",
    "conversationsUsed": 150,
    "conversationsLimit": 300,
    "excessConversations": 0,
    "lastConversationAt": "2026-01-23T10:30:00Z",
    "limitReached": false,
    "usagePercentage": 50,
    "totalConversations": 150,
    "remainingConversations": 150,
    "isOverLimit": false
  }
}
```

### GET /api/v1/chat-usage/:workspaceId/history?months=6

Retorna histórico dos últimos N meses.

### GET /api/v1/chat-usage/:workspaceId/summary?yearMonth=2026-01

Retorna resumo detalhado com eventos recentes.

## Limites por Plano

| Plano      | Conversas/mês |
|------------|---------------|
| FREE       | 50            |
| BASIC      | 300           |
| PRO        | 1.000         |
| ENTERPRISE | 10.000        |

## Logs de Observabilidade

O sistema gera logs estruturados para cada evento:

```
[BILLING] Nova conversa: {"workspaceId":"ws123","yearMonth":"2026-01",...}
[BILLING] Conversa reutilizada: {"workspaceId":"ws123",...}
[BILLING] ⚠️ LIMITE ATINGIDO: {"workspaceId":"ws123","conversationsUsed":300,...}
[BILLING] Excedente registrado: {"workspaceId":"ws123","isExcess":true,...}
```

## Tabelas do Banco

### ChatUsage

Registro mensal de uso por workspace.

| Campo               | Tipo     | Descrição                    |
|---------------------|----------|------------------------------|
| workspaceId         | String   | FK para Workspace            |
| yearMonth           | String   | "2026-01"                    |
| conversationsUsed   | Int      | Conversas dentro do limite   |
| conversationsLimit  | Int      | Limite do mês                |
| excessConversations | Int      | Conversas excedentes         |
| lastConversationAt  | DateTime | Última conversa              |

### ConversationBillingEvent

Evento individual de cada janela de 24h (para auditoria).

| Campo          | Tipo     | Descrição                      |
|----------------|----------|--------------------------------|
| conversationId | String   | ID da conversa                 |
| phoneE164      | String   | Telefone do cliente            |
| windowStartAt  | DateTime | Início da janela de 24h        |
| windowEndAt    | DateTime | Fim da janela de 24h           |
| isExcess       | Boolean  | Se foi contabilizado excedente |
| yearMonth      | String   | Mês de referência              |

## Testes

Rodar testes unitários:

```bash
cd apps/api
npm test -- --testPathPattern=chat-usage
```

## Futuras Evoluções

1. **Cobrança automática**: Integrar com Stripe/PagSeguro para cobrar excedente
2. **Alertas**: Notificar admin quando atingir 80% do limite
3. **Dashboard**: Gráficos de uso no painel
4. **API de upgrade**: Permitir upgrade de plano via API
5. **Múltiplos números**: Suporte a números próprios do cliente
