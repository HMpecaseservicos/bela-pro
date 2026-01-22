# API (REST) — endpoints principais

Base: `/api/v1`

## Auth

- `POST /auth/signup` (cria workspace + owner + membership)
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password` (envia link/código)
- `POST /auth/reset-password`

## Workspace / Perfil

- `GET /me`
- `PATCH /me`
- `GET /workspace`
- `PATCH /workspace` (nome, identidade visual básica, regras)

## Serviços

- `GET /services`
- `POST /services`
- `GET /services/:id`
- `PATCH /services/:id`
- `POST /services/:id/toggle` (ativar/desativar)

## Clientes

- `GET /clients` (busca/paginação)
- `GET /clients/:id`
- `PATCH /clients/:id` (obs internas, status)

## Agenda (admin)

- `GET /calendar/day?date=YYYY-MM-DD`
- `GET /calendar/week?date=YYYY-MM-DD`
- `GET /calendar/month?month=YYYY-MM`
- `POST /appointments` (agendamento manual)
- `PATCH /appointments/:id` (reagendar/cancelar)
- `POST /blocks` (bloqueio manual)
- `DELETE /blocks/:id`

## Disponibilidade (público)

- `GET /public/:slug/services`
- `GET /public/:slug/availability?date=YYYY-MM-DD&serviceIds=...`
- `POST /public/:slug/appointments` (agendamento do cliente)
- `POST /public/:slug/appointments/:id/cancel` (com token)
- `POST /public/:slug/appointments/:id/reschedule` (com token)

## Configurações

- `GET /settings/schedule` (horários, folgas, buffers, antecedência)
- `PUT /settings/schedule`
- `GET /settings/chatbot`
- `PUT /settings/chatbot`

## Financeiro / Relatórios

- `GET /reports/summary?from=...&to=...`
- `GET /reports/no-show?from=...&to=...`
- `GET /reports/services?from=...&to=...`

## Webhooks (WhatsApp)

- `GET /integrations/whatsapp/webhook` (verify)
- `POST /integrations/whatsapp/webhook` (mensagens/eventos)

### Observações de produto

- Endpoints públicos devem usar `slug` e tokens opacos (evitar enumeração).
- `POST /public/:slug/appointments` deve ser idempotente (ex.: header `Idempotency-Key`).
