# Stack final (recomendação)

## Por que esta stack

- **Velocidade de MVP** sem sacrificar arquitetura: NestJS + Prisma é produtivo e padronizado.
- **Escalabilidade**: multi-tenant claro, filas para automação e isolamento de dados.
- **Mobile-first**: Next.js entrega PWA e páginas públicas rápidas.

## Backend

- **Node.js + NestJS** (REST)
- **Prisma** (migrations + types)
- **PostgreSQL** (consistência, relatórios, índices)
- **Redis + BullMQ** (lembretes 24h/2h, retries, idempotência)
- **OpenTelemetry** (observabilidade) e logs estruturados

## Frontend

- **Next.js (App Router)**
- **PWA** (service worker, instalação, offline leve para agenda)
- **UI**: Tailwind + Headless UI (ou shadcn/ui) com design “feminino moderno”

## WhatsApp

- Provedor recomendado: **Meta WhatsApp Cloud API** (oficial) ou **Twilio** (alternativa)
- Integração via **webhook** na API + **fila** para envio/retry

## Autenticação

- JWT **access** curto (ex.: 15 min) + JWT **refresh** (ex.: 30 dias)
- Cookies httpOnly no web (painel) + Bearer tokens no mobile/PWA
- Hash de senha: **Argon2** via `@node-rs/argon2` (binários estáveis em Node moderno)

## Multi-tenant

- Isolamento por `workspaceId` em todas as tabelas relevantes
- Guard global no NestJS valida `workspaceId` do token e aplica filtros
- Evolução opcional: **Postgres RLS** por `workspace_id`
