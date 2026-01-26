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

## Templates

Todas as mensagens são carregadas do `MessageTemplatesModule`.
Nenhuma mensagem é hardcoded no bot.

## Futuro

Arquitetura preparada para migração futura para WhatsApp Cloud API:
- Separação motor/handlers/templates
- Interface abstrata de WhatsApp provider
