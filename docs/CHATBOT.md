# Chatbot WhatsApp — lógica e fluxos

## Princípios

- Linguagem: profissional, acolhedora, clara (tom BELA PRO)
- Sempre oferecer: **Agendar**, **Reagendar**, **Cancelar**, **Falar com humano**
- Evitar loops: máximo 3 tentativas por passo

## Integração

- WhatsApp envia eventos via webhook
- API normaliza mensagens e grava:
  - `Conversation` (por telefone + workspace)
  - `Message` (in/out)
- Um **State Machine** define o próximo passo
- Envio de mensagens é assíncrono via fila (retry/backoff)

## Estados (MVP)

1) `START`
2) `CHOOSE_SERVICE`
3) `CHOOSE_DATE`
4) `CHOOSE_TIME`
5) `CONFIRM`
6) `DONE`
7) `HUMAN_HANDOFF`

## Fluxo: Agendar

- START: “Oi! Sou a Bela Pro. Quer agendar, reagendar ou cancelar?”
- CHOOSE_SERVICE: listar serviços ativos (com preço/duração)
- CHOOSE_DATE: sugerir hoje/amanhã + opção de digitar data
- CHOOSE_TIME: mostrar horários disponíveis (top 6) + “mais horários”
- CONFIRM: confirmar nome + serviço + data/hora
- DONE: enviar confirmação + política de cancelamento

## Fluxo: Confirmar presença (24h e 2h antes)

- Job envia mensagem com botões (sim/não)
- “Não” pode abrir fluxo de reagendamento/cancelamento

## Handoff humano

- A qualquer momento: palavra-chave “humano”, “atendente”
- Estado muda para `HUMAN_HANDOFF`
- Notificar profissional no painel + liberar chat no admin

## Templates (exemplos)

- Confirmação: “Perfeito, {nome}! Seu horário de {servico} ficou para {dataHora}. Qualquer coisa, estou por aqui.”
- Lembrete 24h: “Oi, {nome}! Passando pra lembrar do seu horário amanhã às {hora}. Confirma presença?”
- Lembrete 2h: “Daqui a pouquinho: {hora}. Se precisar reagendar, me avise por aqui.”
