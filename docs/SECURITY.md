# Segurança (boas práticas)

## Autenticação e sessão

- Senhas com **argon2id**
- JWT access curto + refresh com rotação e revogação
- Rate limit em `/auth/*` e endpoints públicos

## Multi-tenant (SaaS)

- Toda query precisa filtrar por `workspaceId`
- Nunca aceitar `workspaceId` do client para operações internas: derive do token
- Auditar operações sensíveis (alterar horário de funcionamento, cancelar agenda)

## Proteções de API

- Validação de payload (DTOs) + whitelist
- Proteção contra enumeração em endpoints públicos (usar `publicSlug`, IDs opacos)
- Idempotência para webhook WhatsApp e criação de agendamento

## LGPD

- Minimizar coleta (nome + telefone)
- Base legal: execução de contrato / legítimo interesse
- Log e consentimento para mensagens de lembrete
- Retenção: política clara + exportação/exclusão sob solicitação

## Infra

- Secrets fora do git
- TLS obrigatório em produção
- Observabilidade: logs estruturados, tracing, métricas
