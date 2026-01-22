# BELA PRO (SaaS)

BELA PRO é uma plataforma SaaS de agenda profissional inteligente para negócios de beleza: agenda digital, página pública de agendamento e automação via WhatsApp.

## 🎯 Funcionalidades Implementadas

- ✅ **Autenticação Multi-tenant**
  - Signup cria workspace + usuário + membership + perfil profissional
  - Login com JWT (15min de validade)
  - Endpoint `/me` protegido com guard JWT

- ✅ **CRUD de Serviços**
  - Criar, listar, atualizar e deletar serviços
  - Validação de nome único por workspace
  - Filtro por status ativo/inativo

- ✅ **Agendamentos**
  - Criar agendamento com um ou múltiplos serviços
  - Detecção automática de conflitos de horário (HTTP 409)
  - Criação/atualização automática de cliente por telefone
  - Cálculo automático de duração total e horário de término
  - Listar agendamentos por período e status
  - Cancelar agendamento

- ✅ **Infraestrutura**
  - Docker Compose com Postgres + Redis + API + Web
  - Prisma ORM com migrations
  - Healthchecks e dependências entre containers
  - Scripts de automação Windows (PowerShell)

## 📚 Documentação

- [Stack Tecnológica](docs/STACK.md)
- [Modelagem do Banco](docs/DB_MODEL.md)
- [Fluxo de Agendamento](docs/BOOKING_FLOW.md)
- [Endpoints da API](docs/API.md)
- **[🧪 Guia de Testes](docs/API_TESTING.md)** ← Exemplos práticos de todas as APIs
- [Chatbot WhatsApp](docs/CHATBOT.md)
- [Segurança](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)

## Visão rápida

- **API**: NestJS (TypeScript) + Prisma + PostgreSQL
- **Web**: Next.js (mobile-first / PWA)
- **Auth**: JWT (access + refresh opcional)
- **Multi-tenant**: isolamento por `workspaceId` (tenant)
- **Automação**: Webhook WhatsApp + filas de lembretes (24h / 2h)

## Estrutura

- `apps/api`: backend (REST)
- `apps/web`: painel + páginas públicas (PWA)
- `packages/shared`: contratos/tipos compartilhados
- `prisma`: schema do banco
- `docs`: especificações de produto/técnicas
- `infra`: docker, observabilidade, deploy

## Rodando (quando dependências estiverem instaladas)

## Rodando com Docker Desktop (recomendado)

Este projeto foi preparado para rodar **tudo dentro de containers** (API/Web), evitando problemas de dependências nativas no Windows.

### Se o comando `docker` não aparece no terminal (Windows)

Checklist rápido:

1) Abra o **Docker Desktop** e aguarde ficar **Running**.
2) Feche e reabra o **VS Code** (ou abra um novo terminal).
3) Teste: `docker --version` e `docker compose version`.

Workaround imediato (se precisar agora):

- `"C:\Program Files\Docker\Docker\resources\bin\docker.exe" --version`
- `"C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose version`

1) Suba os serviços (com build):

```bash
npm run docker:up
```

2) Rode Prisma (generate + migrate) dentro do container da API:

```bash
npm run docker:db:generate
npm run docker:db:migrate
```

3) Acompanhe logs:

```bash
npm run docker:logs
```

4) Verifique a saúde da API:

- `GET http://localhost:3001/api/v1/health`

5) Suba o Web (se não estiver):

```bash
docker compose up -d web
```

### Dica (infra ready)

O compose tem healthchecks de Postgres/Redis; a API só inicia quando ambos estiverem saudáveis.

Web: `http://localhost:3000`

## 🧪 Testar a API

Veja exemplos completos de todos os endpoints em **[docs/API_TESTING.md](docs/API_TESTING.md)**.

**Quick start:**

```powershell
# 1. Login (use um usuário já criado ou faça signup primeiro)
$loginBody = '{"email":"maria@exemplo.com","password":"Senha@123456"}'
$response = Invoke-RestMethod -Uri http://localhost:3001/api/v1/auth/login -Method Post -Body $loginBody -ContentType 'application/json'
$token = $response.accessToken

# 2. Criar serviço
$serviceBody = '{"name":"Corte de Cabelo","description":"Corte moderno","durationMinutes":45,"priceCents":5000}'
$service = Invoke-RestMethod -Uri http://localhost:3001/api/v1/services -Method Post -Body $serviceBody -ContentType 'application/json' -Headers @{Authorization = "Bearer $token"}

# 3. Criar agendamento
$startDateTime = (Get-Date).AddDays(1).Date.AddHours(14).ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$apptBody = "{`"clientName`":`"João Silva`",`"clientPhone`":`"11987654321`",`"serviceIds`":[`"$($service.id)`"],`"startAt`":`"$startDateTime`"}"
Invoke-RestMethod -Uri http://localhost:3001/api/v1/appointments -Method Post -Body $apptBody -ContentType 'application/json' -Headers @{Authorization = "Bearer $token"} | ConvertTo-Json -Depth 5
```

**Endpoints disponíveis:**
- `POST /api/v1/auth/signup` - Criar conta
- `POST /api/v1/auth/login` - Autenticar
- `GET /api/v1/me` - Dados do usuário
- `POST /api/v1/services` - Criar serviço
- `GET /api/v1/services` - Listar serviços
- `PUT /api/v1/services/:id` - Atualizar serviço
- `DELETE /api/v1/services/:id` - Deletar serviço
- `POST /api/v1/appointments` - Criar agendamento
- `GET /api/v1/appointments?from=&to=&status=` - Listar agendamentos
- `PUT /api/v1/appointments/:id/cancel` - Cancelar agendamento

## Rodando sem Docker (não recomendado no Windows)

1) Instalar Docker Desktop (uma vez):

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\install-docker-desktop.ps1
```

2) Subir tudo (sempre que quiser rodar o projeto):

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1
```

## Rodando sem Docker (não recomendado no Windows)

Ainda suportado, mas pode exigir toolchain para dependências nativas.

1) Configure variáveis:

- copie `.env.example` para `.env` (raiz) e também para `apps/api/.env`

2) Prisma:

```bash
npm run db:generate
npm run db:migrate
```

3) API:

```bash
npm run dev:api
```

4) Web:

```bash
npm run dev:web
```

## Docs (entregáveis)

- [docs/STACK.md](docs/STACK.md)
- [docs/DB_MODEL.md](docs/DB_MODEL.md)
- [docs/BOOKING_FLOW.md](docs/BOOKING_FLOW.md)
- [docs/API.md](docs/API.md)
- [docs/CHATBOT.md](docs/CHATBOT.md)
- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
