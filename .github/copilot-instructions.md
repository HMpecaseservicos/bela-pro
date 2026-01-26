# Instruções do Copilot (BELA-PRO)

## Visão geral
- Monorepo com npm workspaces: `apps/api` (NestJS + Prisma), `apps/web` (Next.js), `packages/shared` (tipos/contratos).
- Multi-tenant por `workspaceId` (vem do JWT) e deve ser aplicado em queries Prisma (ex.: controllers pegam `req.user.workspaceId`).

## Comandos úteis (workspaces)
- Dev API: `npm run dev:api` (ou `npm run -w @bela-pro/api dev`)
- Dev Web: `npm run dev:web`
- Build API: `npm run build -w @bela-pro/api`
- Typecheck API (build tsconfig): `cd apps/api && npx tsc -p tsconfig.build.json`
- Prisma (schema na raiz):
  - Generate: `npm run db:generate`
  - Migrate dev: `npm run db:migrate`
- Docker (stack completa): `npm run docker:up` / logs: `npm run docker:logs`

## Backend (NestJS) — padrões do projeto
- Módulos por domínio em `apps/api/src/*` (ex.: `services/`, `appointments/`, `chatbot/`). Registro central em `apps/api/src/app.module.ts`.
- Prisma:
  - Cliente é fornecido por `PrismaService` em `apps/api/src/prisma/prisma.service.ts`.
  - `schema.prisma` fica em `prisma/schema.prisma` (na raiz), e os scripts Prisma da API apontam para ele.
- Validação: serviços usam `zod` no layer de service (ex.: `apps/api/src/services/services.service.ts`, `apps/api/src/appointments/appointments.service.ts`). Controllers tendem a ser finos e repassar `body` “cru”.
- Auth: JWT via `apps/api/src/auth/jwt.strategy.ts`; `JwtAuthGuard` injeta `req.user` com `{ userId, workspaceId, role }`.

## API Routing
- Base path/versionamento é **explícito** nas rotas (não há `app.setGlobalPrefix(...)` em `apps/api/src/main.ts`).
- Rotas públicas/externas devem usar o prefixo `/api/v1`.
- Ao criar novos controllers, use `@Controller('api/v1/<recurso>')` (padrão atual em vários controllers) e não misture padrões (`/v1`, `/api`, prefixo global parcial).
- Se for mudar a versão, faça de forma explícita e consistente (ou via prefixo global ou via `@Controller`, mas não ambos).

## Multi-tenant rules
- Toda query Prisma que lê/escreve dados de negócio **deve** filtrar por `workspaceId`.
- `workspaceId` nunca deve ser inferido implicitamente (sempre vem do JWT via `req.user.workspaceId`).
- Controllers extraem `workspaceId` e passam explicitamente para o service (ex.: `apps/api/src/services/services.controller.ts`).
- Services recebem `workspaceId` como primeiro parâmetro e aplicam o filtro em `where`/`data`.

## Chatbot / WhatsApp
- Implementação principal em `apps/api/src/chatbot/`:
  - Webhook Cloud API e integração alternativa via Evolution API (compose inclui serviço `evolution`).
  - Orquestração: `apps/api/src/chatbot/chatbot.service.ts` → FSM em `apps/api/src/chatbot/state-machine.service.ts`.
  - Tipos centrais e helpers: `apps/api/src/chatbot/chatbot.types.ts`.
- Importante: payload de entrada pode vir de provedores diferentes; trate como union (`IncomingRawPayload`) e use type guards (ex.: `isWhatsAppIncomingMessage`) antes de acessar campos específicos.

## Chatbot / State Machine (contratos)
- A FSM processa **mensagem normalizada**: `messageText` + `ConversationContext`.
- Integrações externas (Cloud API / Evolution) são adaptadas **antes** da FSM em `ChatbotService`.
- A FSM não deve conhecer detalhes de API externa: aceite no máximo `rawMessage?: WhatsAppIncomingMessage` (quando aplicável).
- Contexto persistido (`contextJson`) deve ser parseado/serializado de forma segura (ex.: `parseConversationContext` / `serializeConversationContext`).

## Integrações / ambiente
- `docker-compose.yml` sobe Postgres + Redis + API + Web + Evolution API.
- Variáveis relevantes (compose): `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `EVOLUTION_API_URL/KEY/INSTANCE_NAME`.
