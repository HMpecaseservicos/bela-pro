# Módulo WhatsApp Bot - BELA PRO

## Visão Geral

Bot de WhatsApp integrado via QR Code (WhatsApp Web) usando `whatsapp-web.js`.

**MVP focado em simplicidade e estabilidade** - pronto para deploy no Railway.

### Características Principais

- ✅ **Multi-tenant real**: cada workspace/admin tem seu próprio bot
- ✅ **QR Code exclusivo**: isolamento total entre clientes
- ✅ **Templates configuráveis**: todas as mensagens vêm do banco de dados
- ✅ **Compatível com Railway**: Node.js direto, sem Docker
- ✅ **Persistência de sessão**: reconexão automática após restart

---

## Estrutura de Arquivos

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

---

## Deploy no Railway

### Variáveis de Ambiente (OBRIGATÓRIAS)

```env
# Banco de dados
DATABASE_URL=postgresql://user:pass@host:5432/bela_pro

# JWT (autenticação)
JWT_ACCESS_SECRET=sua-chave-secreta

# Redis (opcional, para cache)
REDIS_URL=redis://host:6379

# Puppeteer/Chromium (Railway configura automaticamente)
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Configuração Railway

1. Crie um novo projeto no Railway
2. Conecte o repositório GitHub
3. Configure as variáveis de ambiente acima
4. Railway detecta Node.js automaticamente
5. Deploy acontece via `npm run build && npm start`

### Nixpacks (Railway)

O Railway usa Nixpacks para build. Para garantir que Chromium esteja disponível, 
adicione ao `nixpacks.toml` na raiz:

```toml
[phases.setup]
nixPkgs = ["chromium"]

[variables]
PUPPETEER_EXECUTABLE_PATH = "/nix/store/chromium/bin/chromium"
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true"
```

---

## Multi-tenant (Como Funciona)

### Regra Fundamental
> **Cada workspace = 1 admin = 1 bot = 1 sessão WhatsApp**

### Isolamento Garantido

```
Workspace A (Salão Maria)  →  Sessão A  →  WhatsApp do Salão Maria
Workspace B (Barbearia João) →  Sessão B  →  WhatsApp da Barbearia
Workspace C (Clínica Ana)   →  Sessão C  →  WhatsApp da Clínica
```

- Sessões são isoladas por `workspaceId`
- QR Codes são únicos e não compartilhados
- Mensagens só vão para o workspace correto
- Não há vazamento de dados entre clientes

### Persistência

Sessões são salvas em `.whatsapp-sessions/{workspaceId}/` e sobrevivem a restarts.

---

## Endpoints da API

### Status e Conexão

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/chatbot/health` | Health check |
| `GET` | `/api/v1/chatbot/whatsapp/status` | Status da conexão |
| `POST` | `/api/v1/chatbot/whatsapp/connect` | Iniciar conexão (gera QR) |
| `GET` | `/api/v1/chatbot/whatsapp/qrcode` | Obter QR Code atual |
| `POST` | `/api/v1/chatbot/whatsapp/disconnect` | Desconectar sessão |

### Templates do Bot

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/chatbot/templates` | Listar todas templates |
| `PUT` | `/api/v1/chatbot/templates/:key` | Atualizar template |
| `DELETE` | `/api/v1/chatbot/templates/:key` | Resetar para padrão |

---

## Estados da Sessão

| Estado | Descrição |
|--------|-----------|
| `disconnected` | Sem conexão ativa |
| `connecting` | Iniciando conexão |
| `qr_pending` | Aguardando scan do QR Code |
| `connected` | Conectado e funcionando |
| `auth_failure` | Falha na autenticação |

---

## Templates Configuráveis

### Templates Disponíveis

| Key | Label | Descrição |
|-----|-------|-----------|
| `WELCOME` | Boas-vindas | Primeira mensagem ao cliente |
| `MENU` | Menu Principal | Opções disponíveis |
| `HELP` | Ajuda | Instruções de uso |
| `UNKNOWN_COMMAND` | Comando Desconhecido | Resposta para comandos inválidos |
| `HUMAN_HANDOFF` | Atendimento Humano | Transferência para atendente |
| `BOOKING_LINK` | Link de Agendamento | URL para agendar online |
| `NO_APPOINTMENTS` | Sem Agendamentos | Quando não há agendamentos |

### Variáveis Dinâmicas

Templates suportam variáveis que são substituídas em runtime:

| Variável | Descrição |
|----------|-----------|
| `{nome}` | Nome do cliente |
| `{data}` | Data formatada |
| `{hora}` | Hora formatada |
| `{servico}` | Nome do serviço |
| `{link}` | Link de agendamento |

### Exemplo de Template

```
Olá {nome}! 👋

Seu agendamento está confirmado:
📅 {data} às {hora}
💇 {servico}

Até breve!
```

### API de Templates

**Listar templates:**
```http
GET /api/v1/chatbot/templates
Authorization: Bearer <token>
```

**Atualizar template:**
```http
PUT /api/v1/chatbot/templates/WELCOME
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Oi! 🎉 Bem-vindo ao nosso salão!"
}
```

**Resetar para padrão:**
```http
DELETE /api/v1/chatbot/templates/WELCOME
Authorization: Bearer <token>
```

---

## Fluxo de Conexão (Passo a Passo)

1. **Admin acessa Dashboard > Chatbot**
2. **Clica em "Conectar WhatsApp"**
3. **Frontend chama** `POST /api/v1/chatbot/whatsapp/connect`
4. **Backend inicia sessão** e gera QR Code
5. **Frontend faz polling** em `GET /whatsapp/status` (3s)
6. **Admin escaneia QR** no celular (WhatsApp > Aparelhos conectados)
7. **Status muda** para `connected`
8. **Bot começa a responder** mensagens automaticamente

---

## Frontend (UI Simples)

O frontend implementa:

- ✅ Exibição de status (conectado/desconectado)
- ✅ Botão conectar/desconectar
- ✅ Exibição do QR Code (imagem base64)
- ✅ Polling a cada 3 segundos
- ✅ Feedback visual de estados

---

## Troubleshooting

### QR Code não aparece

1. Verifique logs do Railway: `railway logs`
2. Confirme que Chromium está instalado
3. Verifique `PUPPETEER_EXECUTABLE_PATH`

### Sessão desconecta sozinha

1. WhatsApp Web tem limite de inatividade
2. Verifique estabilidade da conexão
3. A sessão reconecta automaticamente se persistida

### Erro de Puppeteer no Railway

1. Adicione Chromium ao `nixpacks.toml`
2. Configure `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
3. Verifique se `PUPPETEER_EXECUTABLE_PATH` está correto

---

## Evoluções Futuras

> ⚠️ **As seguintes funcionalidades NÃO fazem parte do MVP atual:**

| Funcionalidade | Status |
|----------------|--------|
| WhatsApp Cloud API (oficial) | 🔮 Futuro |
| Docker/Container | 🔮 Futuro |
| WebSocket para status realtime | 🔮 Futuro |
| Fila de mensagens (Redis) | 🔮 Futuro |
| Chatbot com IA/LLM | 🔮 Futuro |
| Multi-número por workspace | 🔮 Futuro |

O foco atual é **MVP funcional, estável e simples**.

---

## Arquitetura Simplificada

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│              (Next.js - Dashboard)                           │
│         Status | QR Code | Conectar/Desconectar             │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API (polling)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    CHATBOT CONTROLLER                        │
│                 /api/v1/chatbot/*                            │
│          status | connect | qrcode | disconnect              │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│  SESSION MANAGER    │         │   BOT SERVICE       │
│                     │         │                     │
│ - Multi-tenant      │         │ - Handlers          │
│ - QR Code           │◄────────│ - Templates (DB)    │
│ - Estados           │         │ - Respostas         │
│ - Puppeteer         │         │                     │
└─────────────────────┘         └──────────┬──────────┘
          │                                │
          ▼                                ▼
┌─────────────────────┐         ┌─────────────────────┐
│   whatsapp-web.js   │         │   ChatbotTemplate   │
│   (WhatsApp Web)    │         │   (Prisma/Postgres) │
└─────────────────────┘         └─────────────────────┘
```

---

## Conclusão

Este módulo entrega um **WhatsApp Bot funcional** para o MVP do BELA PRO:

- ✅ Funciona via QR Code
- ✅ Multi-tenant real
- ✅ Templates 100% configuráveis
- ✅ Compatível com Railway
- ✅ Sem dependência de Docker
- ✅ Pronto para produção

**Simplicidade, estabilidade e foco no que importa.**
