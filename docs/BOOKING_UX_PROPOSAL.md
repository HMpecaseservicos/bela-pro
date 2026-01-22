# 📋 Proposta de Produto & UX — Página Pública de Agendamento BELA PRO

> **Versão**: 1.0  
> **Data**: 20 de janeiro de 2026  
> **Status**: Em validação

---

## 1. Diagnóstico do Problema Atual

| Problema | Impacto |
|----------|---------|
| Começa direto em "Escolha um serviço" | Frio, transacional, sem acolhimento |
| Serviços exibidos como lista genérica | Não comunica valor, parece cardápio |
| Sem sinais de confiança | Cliente não sabe se é seguro agendar |
| Stepper no topo sem contexto | Usuário não entende o que esperar |
| Visual "dev mode" | Não transmite profissionalismo do salão |

---

## 2. Princípios de Design

| Princípio | Aplicação |
|-----------|-----------|
| **Acolhimento antes de ação** | Saudar antes de pedir escolha |
| **Proposta de valor por serviço** | Cada serviço vende uma transformação |
| **Confiança implícita** | Micro-sinais que reduzem ansiedade |
| **Progressão clara** | Usuário sempre sabe onde está e o que falta |
| **Mobile-first real** | Thumb zone, scroll natural, CTAs fixos |

---

## 3. Estrutura da Página (Blocos)

### 📱 Mobile View — Scroll Vertical

```
┌─────────────────────────────────────────────┐
│  HEADER WORKSPACE                           │
│  ┌─────────────────────────────────────┐   │
│  │ [Logo/Avatar]                        │   │
│  │ Nome do Estabelecimento              │   │
│  │ 📍 Endereço curto                    │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  BLOCO BOAS-VINDAS                         │
│  ┌─────────────────────────────────────┐   │
│  │ "Agende seu horário"                 │   │ ← Título configurável
│  │ "Escolha o serviço ideal para você   │   │ ← Subtítulo configurável
│  │  e reserve em menos de 1 minuto"     │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  BADGES DE CONFIANÇA                       │
│  ┌─────────────────────────────────────┐   │
│  │ ✓ Confirmação automática             │   │
│  │ ✓ Horários atualizados em tempo real │   │
│  │ ✓ Cancelamento fácil                 │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  PROGRESS INDICATOR (mínimo)               │
│  ┌─────────────────────────────────────┐   │
│  │ Etapa 1 de 4 · Serviço               │   │
│  │ ━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  LISTA DE SERVIÇOS                         │
│  ┌─────────────────────────────────────┐   │
│  │ 💇 Corte Feminino                    │   │
│  │ "Corte moderno com acabamento        │   │ ← Descrição configurável
│  │  personalizado"                      │   │
│  │                                      │   │
│  │ ⏱ 60 min          R$ 80,00          │   │
│  │                         [Selecionar] │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🎨 Coloração                         │   │
│  │ "Transformação completa com          │   │
│  │  produtos premium"                   │   │
│  │                                      │   │
│  │ ⏱ 120 min         R$ 150,00         │   │
│  │                         [Selecionar] │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  FOOTER FIXO (após seleção)                │
│  ┌─────────────────────────────────────┐   │
│  │ Corte Feminino · R$ 80,00            │   │
│  │ [         Continuar →         ]      │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  MICRO FOOTER                              │
│  Powered by BELA PRO                        │
└─────────────────────────────────────────────┘
```

---

## 4. Detalhamento de Cada Bloco

### 4.1 Header do Workspace

| Campo | Fonte | Fallback |
|-------|-------|----------|
| Logo/Avatar | `workspace.logoUrl` | Inicial do nome em círculo colorido |
| Nome | `workspace.name` | — |
| Endereço | `workspace.address` | Ocultar se vazio |
| Cor primária | `workspace.primaryColor` | `#6366f1` (indigo) |

**UX**: O header cria identidade. O cliente precisa sentir que está no "espaço digital" do salão.

---

### 4.2 Bloco de Boas-Vindas

| Campo | Configurável? | Default |
|-------|---------------|---------|
| Título principal | ✅ Sim | "Agende seu horário" |
| Subtítulo | ✅ Sim | "Escolha o serviço ideal e reserve em menos de 1 minuto" |

**Por que existe**: Acolhe antes de pedir ação. Remove a frieza de "Escolha um serviço".

**Copy alternativa configurável**:
- "Reserve seu momento de cuidado"
- "Seu horário, do seu jeito"
- "Agende agora, sem complicação"

---

### 4.3 Badges de Confiança

| Badge | Significado | Configurável? |
|-------|-------------|---------------|
| ✓ Confirmação automática | "Você recebe confirmação imediata" | ✅ Ligar/desligar |
| ✓ Horários em tempo real | "Só mostramos o que está disponível" | ✅ Ligar/desligar |
| ✓ Cancelamento fácil | "Pode remarcar sem burocracia" | ✅ Ligar/desligar |
| ✓ Pagamento no local | "Pague direto no salão" | ✅ Ligar/desligar |

**UX**: Reduz atrito mental. O cliente pensa "ok, posso confiar".

---

### 4.4 Progress Indicator

**Formato atual** (stepper numerado): ❌ Ocupa espaço, visualmente pesado

**Formato proposto** (barra + texto):
```
Etapa 1 de 4 · Serviço
━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░ 25%
```

| Etapa | Label |
|-------|-------|
| 1 | Serviço |
| 2 | Data |
| 3 | Horário |
| 4 | Seus dados |

**UX**: Minimalista, não compete com o conteúdo, mas dá orientação.

---

### 4.5 Cards de Serviço

**Estrutura do card**:

```
┌────────────────────────────────────────────┐
│ [Emoji/Ícone]  Nome do Serviço             │
│                                            │
│ "Descrição que vende a transformação,      │
│  não apenas o procedimento"                │
│                                            │
│ ⏱ 60 min                       R$ 80,00   │
│                                            │
│ ○ Selecionar                               │ ← Radio ou botão
└────────────────────────────────────────────┘
```

**Campos configuráveis no admin**:

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `name` | string | ✅ |
| `description` | string | ✅ (até 100 chars) |
| `duration` | number | ✅ |
| `price` | number | ✅ |
| `emoji` | string | Opcional (default por categoria) |
| `order` | number | Para ordenação manual |
| `highlight` | boolean | Destaca como "mais popular" |

**Estados do card**:

| Estado | Visual |
|--------|--------|
| Default | Borda cinza clara, fundo branco |
| Hover | Borda primária suave, sombra leve |
| Selecionado | Borda primária sólida, check visível, fundo levemente tinted |
| Disabled | Opacity 50%, sem interação |

---

### 4.6 Footer Fixo (Sticky CTA)

**Aparece quando**: Um serviço é selecionado

```
┌────────────────────────────────────────────┐
│ 💇 Corte Feminino · R$ 80,00               │
│                                            │
│ [       Escolher data →       ]            │ ← Botão primário
└────────────────────────────────────────────┘
```

**UX**: Sempre visível, não precisa rolar. Thumb-friendly.

**Labels do CTA por etapa**:

| Etapa | Label do Botão |
|-------|----------------|
| 1 → 2 | "Escolher data →" |
| 2 → 3 | "Ver horários →" |
| 3 → 4 | "Preencher dados →" |
| 4 → ✓ | "Confirmar agendamento" |

---

## 5. Estados da Interface

### 5.1 Estados Globais

| Estado | Comportamento |
|--------|---------------|
| **Loading inicial** | Skeleton do header + cards (3 placeholders) |
| **Erro de rede** | Mensagem amigável + botão "Tentar novamente" |
| **Workspace não encontrado** | Página 404 com "Estabelecimento não encontrado" |
| **Sem serviços cadastrados** | "Este estabelecimento ainda está configurando a agenda" |

### 5.2 Estados por Etapa

**Etapa 2 — Data**:

| Estado | Visual |
|--------|--------|
| Dias disponíveis | Fundo branco, clicável |
| Dias indisponíveis | Cinza, não clicável |
| Dia selecionado | Fundo primário, texto branco |
| Carregando slots | Spinner no calendário |

**Etapa 3 — Horário**:

| Estado | Visual |
|--------|--------|
| Slot disponível | Badge/pill clicável |
| Slot selecionado | Fundo primário |
| Sem slots | "Nenhum horário disponível neste dia. Tente outra data." |
| Carregando | Skeleton de 6 pills |

**Etapa 4 — Dados**:

| Estado | Visual |
|--------|--------|
| Campos vazios | Placeholder com exemplo |
| Validação erro | Borda vermelha + mensagem inline |
| Enviando | Botão disabled + spinner |
| Sucesso | Redirect para página de confirmação |

---

## 6. Página de Confirmação (Pós-Agendamento)

```
┌────────────────────────────────────────────┐
│                                            │
│              ✅                             │
│      Agendamento confirmado!               │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Corte Feminino                         │ │
│ │ 📅 Terça, 21 de janeiro                │ │
│ │ ⏰ 14:00                               │ │
│ │ 📍 Rua b QD 4 LT 4 Setor b            │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Você receberá um lembrete por WhatsApp.    │ ← Configurável
│                                            │
│ [  Adicionar ao Calendário  ]              │
│ [      Fazer novo agendamento      ]       │
│                                            │
└────────────────────────────────────────────┘
```

---

## 7. Configurações do Admin (O que deve ser editável)

### 7.1 Nova Seção: "Página de Agendamento"

| Campo | Tipo | Onde aparece |
|-------|------|--------------|
| `bookingTitle` | string | Título principal |
| `bookingSubtitle` | string | Subtítulo |
| `showTrustBadges` | boolean | Exibir badges de confiança |
| `trustBadges` | array | Quais badges mostrar |
| `confirmationMessage` | string | Texto pós-agendamento |
| `showWhatsappReminder` | boolean | Mencionar lembrete WhatsApp |

### 7.2 Por Serviço (já existe, precisa adicionar)

| Campo | Atual? | Adicionar |
|-------|--------|-----------|
| `name` | ✅ | — |
| `price` | ✅ | — |
| `duration` | ✅ | — |
| `description` | ❓ | ✅ Descrição curta (até 100 chars) |
| `emoji` | ❌ | ✅ Emoji/ícone |
| `order` | ❌ | ✅ Ordem de exibição |
| `isHighlighted` | ❌ | ✅ Marcar como "mais popular" |
| `isActive` | ✅ | — |

---

## 8. Hierarquia Visual (Tipografia)

| Elemento | Tamanho Mobile | Peso |
|----------|---------------|------|
| Nome do workspace | 18px | 600 |
| Título principal | 24px | 700 |
| Subtítulo | 14px | 400 |
| Nome do serviço | 16px | 600 |
| Descrição serviço | 14px | 400 |
| Preço | 16px | 700 |
| Duração | 12px | 400 |
| CTA button | 16px | 600 |

---

## 9. Paleta de Cores (Derivada do Workspace)

| Token | Uso | Default |
|-------|-----|---------|
| `--primary` | CTAs, seleção, links | Cor do workspace |
| `--primary-light` | Fundo selecionado | primary @ 10% opacity |
| `--text-primary` | Títulos | `#1f2937` |
| `--text-secondary` | Descrições, labels | `#6b7280` |
| `--border` | Cards, inputs | `#e5e7eb` |
| `--background` | Página | `#f9fafb` |
| `--surface` | Cards | `#ffffff` |

---

## 10. Resumo Executivo

### O que muda:

| Antes | Depois |
|-------|--------|
| Começa em "Escolha um serviço" | Começa com boas-vindas + contexto |
| Serviços = lista genérica | Serviços = propostas de valor |
| Sem sinais de confiança | Badges que reduzem ansiedade |
| Stepper pesado | Progress bar minimalista |
| CTA no final da lista | CTA fixo no footer |
| Não configurável | 90% controlado pelo admin |

### Próximos passos:

1. ✅ **Validar esta proposta** ← Estamos aqui
2. ⬜ Definir campos a adicionar no schema Prisma (se necessário)
3. ⬜ Atualizar API para retornar novos campos
4. ⬜ Implementar novo layout da página pública
5. ⬜ Criar seção "Página de Agendamento" no admin

---

## 11. Referências de Inspiração

- **Notion**: Simplicidade, hierarquia clara, espaço em branco
- **Nubank**: Confiança, clareza nas ações, feedback imediato
- **iFood Beauty**: Cards de serviço, fluxo de seleção
- **Cal.com**: Progress indicator, mobile-first
- **Calendly**: Confirmação, integração com calendário

---

## Changelog

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-01-20 | 1.0 | Versão inicial da proposta |
