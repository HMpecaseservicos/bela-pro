# Fluxo lógico de agendamento (CORE)

## Conceitos

- **Disponibilidade** = Horário de funcionamento + folgas + bloqueios + agenda existente + regras (buffer/antecedência)
- **Appointment** sempre pertence a um `workspaceId`.
- **Cliente** é criado/atualizado automaticamente pelo telefone.

## Regras (recomendadas)

- Antecedência mínima: ex.: 2h (configurável)
- Janela máxima: ex.: 60 dias (configurável)
- Buffer entre atendimentos: ex.: 10 min (configurável)
- Cancelamento permitido até: ex.: 2h antes (configurável)

## Cálculo de slots disponíveis (visão pública)

1) Entrada: `publicSlug`, `serviceId(s)`, `date`
2) Resolver duração total:
   - serviços combinados somam duração + buffers
3) Carregar regras do dia:
   - horários de trabalho do dia da semana
   - folgas e exceções (time off)
   - bloqueios manuais
4) Carregar conflitos:
   - appointments confirmados/pending no dia
5) Gerar slots (step típico: 5 min) e filtrar:
   - respeitar antecedência mínima (agora + minLeadTime)
   - respeitar buffers
   - respeitar limites de janela
6) Retornar lista de horários

## Criação do agendamento

- Recomendado: criação com **transação**
- Validar novamente disponibilidade (anti-race)
- Criar/atualizar cliente
- Criar appointment + appointmentServices
- Disparar mensagens (confirmação) e agendar lembretes (24h/2h)

## Reagendamento/cancelamento

- Reagendar = cancelar antigo + criar novo (ou mudar startAt/endAt com auditoria)
- Cancelamento deve registrar motivo e quem cancelou (cliente/profissional)
