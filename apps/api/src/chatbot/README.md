# Módulo WhatsApp Bot - BELA PRO

## Visão Geral

Bot de WhatsApp integrado via QR Code (WhatsApp Web) usando `whatsapp-web.js`.

**Características:**
- Uma sessão por workspace (admin)
- QR Code exclusivo por workspace
- Templates de mensagem configuráveis (via MessageTemplatesModule)
- Separação clara: motor WhatsApp | handlers | templates

## Estrutura

```
chatbot/
├── README.md                   # Este arquivo
├── index.ts                    # Exports
├── chatbot.module.ts           # NestJS Module
├── chatbot.controller.ts       # REST endpoints
├── whatsapp-session.manager.ts # Gerenciamento de sessões multi-tenant
├── whatsapp-bot.service.ts     # Handlers do bot + templates
└── whatsapp.types.ts           # Types e interfaces
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /chatbot/health | Health check |
| GET | /chatbot/whatsapp/status | Status da conexão do workspace |
| POST | /chatbot/whatsapp/connect | Iniciar conexão (gera QR) |
| GET | /chatbot/whatsapp/qrcode | Obter QR Code atual |
| POST | /chatbot/whatsapp/disconnect | Desconectar sessão |
| GET | /chatbot/templates | Listar todas as templates do bot |
| PUT | /chatbot/templates/:key | Atualizar conteúdo de uma template |
| DELETE | /chatbot/templates/:key | Resetar template para valor padrão |

## Templates do Bot

Templates configuráveis via tabela `ChatbotTemplate`:

| Key | Descrição |
|-----|-----------|
| `WELCOME` | Mensagem de boas-vindas |
| `MENU` | Menu principal com opções |
| `HELP` | Ajuda e instruções |
| `UNKNOWN_COMMAND` | Comando não reconhecido |
| `HUMAN_HANDOFF` | Transferência para atendente |
| `BOOKING_LINK` | Link para agendamento |
| `NO_APPOINTMENTS` | Sem agendamentos encontrados |

### Exemplo: Listar templates

```bash
GET /api/v1/chatbot/templates
Authorization: Bearer <token>

# Response
{
  "success": true,
  "data": [
    {
      "key": "WELCOME",
      "label": "Boas-vindas",
      "description": "Primeira mensagem ao iniciar conversa",
      "defaultContent": "Olá! 👋 Bem-vindo...",
      "currentContent": "Olá! 👋 Bem-vindo...",
      "isCustomized": false
    }
  ]
}
```

### Exemplo: Atualizar template

```bash
PUT /api/v1/chatbot/templates/WELCOME
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Oi! 🎉 Que bom ver você por aqui!"
}
```

## Fluxo de Conexão

1. Admin acessa Dashboard > Chatbot
2. Frontend chama `POST /whatsapp/connect`
3. Backend inicia sessão e gera QR Code
4. Admin escaneia QR no celular
5. Status muda para `connected`
6. Bot começa a responder mensagens

## Estados da Sessão

- `disconnected` - Sem conexão
- `qr_pending` - Aguardando escaneamento do QR
- `connected` - Conectado e operacional
- `connecting` - Em processo de conexão

## Arquitetura de Templates

1. **Tabela `ChatbotTemplate`**: Admin customiza mensagens via API
2. **Fallback**: Se não existir customização, usa valor padrão do código
3. **Cache**: WhatsAppBotService carrega templates sob demanda
4. **Multi-tenant**: Cada workspace tem suas próprias customizações

## Futuro

Arquitetura preparada para migração futura para WhatsApp Cloud API:
- Separação motor/handlers/templates
- Interface abstrata de WhatsApp provider
