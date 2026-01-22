# 🛠️ Plano de Implementação — Nova Página de Agendamento

> **Versão**: 1.0  
> **Data**: 20 de janeiro de 2026  
> **Baseado em**: [BOOKING_UX_PROPOSAL.md](./BOOKING_UX_PROPOSAL.md)

---

## 📋 Análise do Estado Atual

### Schema Prisma (O que já existe)

| Campo | Model | Status | Observação |
|-------|-------|--------|------------|
| `name` | Service | ✅ Existe | — |
| `description` | Service | ✅ Existe | Já existe no schema |
| `durationMinutes` | Service | ✅ Existe | — |
| `priceCents` | Service | ✅ Existe | — |
| `isActive` | Service | ✅ Existe | — |
| `showInBooking` | Service | ✅ Existe | Ótimo! Já pensaram nisso |
| `sortOrder` | Service | ✅ Existe | Para ordenação manual |
| `welcomeText` | Workspace | ✅ Existe | Título de boas-vindas |
| `description` | Workspace | ✅ Existe | Descrição do negócio |
| `brandName` | Workspace | ✅ Existe | Nome da marca |
| `primaryColorHex` | Workspace | ✅ Existe | Cor primária |
| `logoUrl` | Workspace | ✅ Existe | Logo do estabelecimento |

### Schema Prisma (O que PRECISA ser adicionado)

| Campo | Model | Tipo | Default | Uso |
|-------|-------|------|---------|-----|
| `bookingTitle` | Workspace | String? | "Agende seu horário" | Título da página |
| `bookingSubtitle` | Workspace | String? | "Escolha o serviço ideal..." | Subtítulo |
| `showTrustBadges` | Workspace | Boolean | true | Exibir badges |
| `emoji` | Service | String? | null | Emoji do serviço |
| `isHighlighted` | Service | Boolean | false | Marcar como popular |

### Frontend Atual (`booking/page.tsx`)

| Componente | Status | Problema |
|------------|--------|----------|
| Header com logo | ✅ | Funcional |
| Stepper visual | ❌ | Pesado, ocupa espaço |
| Cards de serviço | ⚠️ | Sem descrição, sem emoji |
| Bloco boas-vindas | ❌ | Não existe |
| Badges de confiança | ❌ | Não existe |
| Footer sticky CTA | ❌ | Não existe |
| Estados de loading | ⚠️ | Básico, sem skeleton |

---

## 🎯 Decisão Estratégica

### Opção A: Alterar Schema Prisma
- **Prós**: Campos persistidos, configuráveis pelo admin
- **Contras**: Migration, rebuild de containers, mais trabalho

### Opção B: Usar campos existentes + Defaults no Frontend
- **Prós**: Zero mudança no backend, deploy imediato
- **Contras**: Alguns campos ficam hardcoded (badges)

### ✅ Decisão: Opção Híbrida
1. **Fase 1**: Refatorar frontend usando campos EXISTENTES + defaults inteligentes
2. **Fase 2**: (Futuro) Adicionar campos ao schema se necessário

Isso nos permite entregar valor AGORA sem risco de breaking changes.

---

## 📁 Estrutura de Arquivos

### Atual
```
apps/web/src/app/[slug]/booking/
└── page.tsx (255 linhas, monolítico)
```

### Proposta
```
apps/web/src/app/[slug]/booking/
├── page.tsx                    # Componente principal (orquestrador)
├── components/
│   ├── BookingHeader.tsx       # Header do workspace
│   ├── WelcomeSection.tsx      # Título + subtítulo + badges
│   ├── ProgressBar.tsx         # Barra de progresso minimalista
│   ├── ServiceCard.tsx         # Card individual de serviço
│   ├── ServiceList.tsx         # Lista de serviços (etapa 1)
│   ├── DatePicker.tsx          # Seleção de data (etapa 2)
│   ├── TimeSlots.tsx           # Seleção de horário (etapa 3)
│   ├── ClientForm.tsx          # Formulário de dados (etapa 4)
│   ├── ConfirmationScreen.tsx  # Tela de sucesso
│   ├── StickyFooter.tsx        # CTA fixo no rodapé
│   └── Skeleton.tsx            # Loading states
├── hooks/
│   └── useBooking.ts           # Hook com toda a lógica de estado
├── types.ts                    # Interfaces TypeScript
├── constants.ts                # Textos default, emojis, etc.
└── utils.ts                    # Funções auxiliares (formatação)
```

---

## 📝 Checklist de Implementação

### Fase 1: Preparação (sem tocar no código atual)

- [ ] **1.1** Criar estrutura de pastas
- [ ] **1.2** Criar arquivo `types.ts` com interfaces
- [ ] **1.3** Criar arquivo `constants.ts` com defaults
- [ ] **1.4** Criar arquivo `utils.ts` com funções utilitárias
- [ ] **1.5** Criar hook `useBooking.ts` extraindo lógica do page.tsx

### Fase 2: Componentes Base

- [ ] **2.1** `Skeleton.tsx` - Loading states reutilizáveis
- [ ] **2.2** `ProgressBar.tsx` - Nova barra de progresso minimalista
- [ ] **2.3** `StickyFooter.tsx` - CTA fixo

### Fase 3: Componentes de Conteúdo

- [ ] **3.1** `BookingHeader.tsx` - Header refatorado
- [ ] **3.2** `WelcomeSection.tsx` - Título + badges de confiança
- [ ] **3.3** `ServiceCard.tsx` - Card com emoji, descrição, estados
- [ ] **3.4** `ServiceList.tsx` - Container da lista

### Fase 4: Etapas do Wizard

- [ ] **4.1** `DatePicker.tsx` - Refatorar seleção de data
- [ ] **4.2** `TimeSlots.tsx` - Refatorar seleção de horário
- [ ] **4.3** `ClientForm.tsx` - Refatorar formulário
- [ ] **4.4** `ConfirmationScreen.tsx` - Tela de sucesso melhorada

### Fase 5: Integração

- [ ] **5.1** Reescrever `page.tsx` usando novos componentes
- [ ] **5.2** Testar fluxo completo
- [ ] **5.3** Verificar responsividade mobile
- [ ] **5.4** Ajustar cores e espaçamentos finais

---

## 🎨 Design Tokens

```typescript
// constants.ts

export const COLORS = {
  background: '#f9fafb',
  surface: '#ffffff',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  success: '#10b981',
  error: '#ef4444',
  // Primary vem do workspace.primaryColorHex
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const TYPOGRAPHY = {
  h1: { size: 24, weight: 700 },
  h2: { size: 20, weight: 600 },
  body: { size: 16, weight: 400 },
  small: { size: 14, weight: 400 },
  tiny: { size: 12, weight: 400 },
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};
```

---

## 📋 Textos Default (Copy)

```typescript
// constants.ts

export const DEFAULT_COPY = {
  // Boas-vindas
  bookingTitle: 'Agende seu horário',
  bookingSubtitle: 'Escolha o serviço ideal para você e reserve em menos de 1 minuto',
  
  // Badges de confiança
  trustBadges: [
    { icon: '✓', text: 'Confirmação automática' },
    { icon: '✓', text: 'Horários em tempo real' },
    { icon: '✓', text: 'Cancelamento fácil' },
  ],
  
  // Etapas
  steps: [
    { label: 'Serviço', shortLabel: 'Serviço' },
    { label: 'Data', shortLabel: 'Data' },
    { label: 'Horário', shortLabel: 'Horário' },
    { label: 'Seus dados', shortLabel: 'Dados' },
  ],
  
  // CTAs por etapa
  ctaLabels: {
    1: 'Escolher data →',
    2: 'Ver horários →',
    3: 'Preencher dados →',
    4: 'Confirmar agendamento',
  },
  
  // Estados vazios
  emptyStates: {
    noServices: 'Este estabelecimento ainda está configurando a agenda',
    noDates: 'Nenhuma data disponível no momento',
    noSlots: 'Nenhum horário disponível neste dia. Tente outra data.',
  },
  
  // Sucesso
  confirmation: {
    title: 'Agendamento confirmado!',
    subtitle: 'Você receberá uma confirmação em breve',
  },
  
  // Erros
  errors: {
    notFound: 'Estabelecimento não encontrado',
    requiredFields: 'Preencha todos os campos',
    generic: 'Ocorreu um erro. Tente novamente.',
  },
};

// Emojis default por categoria de serviço
export const SERVICE_EMOJIS: Record<string, string> = {
  'corte': '✂️',
  'coloração': '🎨',
  'coloracao': '🎨',
  'manicure': '💅',
  'pedicure': '🦶',
  'massagem': '💆',
  'depilação': '✨',
  'depilacao': '✨',
  'maquiagem': '💄',
  'sobrancelha': '👁️',
  'barba': '🧔',
  'hidratação': '💧',
  'hidratacao': '💧',
  'escova': '💇',
  'penteado': '👰',
  'tratamento': '🧴',
  'default': '💇',
};
```

---

## 🔄 Mapeamento de Campos

| Proposta UX | Campo Atual | Fallback |
|-------------|-------------|----------|
| Título principal | `workspace.bookingTitle` | `workspace.welcomeText` ou DEFAULT |
| Subtítulo | `workspace.bookingSubtitle` | `workspace.description` ou DEFAULT |
| Nome workspace | `workspace.brandName` | `workspace.name` |
| Endereço | `profile.addressLine` | Ocultar |
| Logo | `workspace.logoUrl` | Avatar com inicial |
| Cor primária | `workspace.primaryColorHex` | `#6366f1` |
| Emoji serviço | inferir de `service.name` | `💇` |
| Descrição serviço | `service.description` | `null` (ocultar) |
| Ordem serviços | `service.sortOrder` | ordem alfabética |
| Mostrar serviço | `service.showInBooking` | `true` |

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Quebrar fluxo de booking | Média | Alto | Testar cada etapa antes de integrar |
| Hidratação SSR/Client | Baixa | Médio | Manter `'use client'` + `mounted` check |
| Responsividade quebrada | Média | Alto | Testar em viewport 320px desde o início |
| API retorna dados diferentes | Baixa | Médio | Usar optional chaining + fallbacks |

---

## ✅ Critérios de Aceite

### Funcional
- [ ] Usuário consegue completar agendamento do início ao fim
- [ ] Todas as 4 etapas funcionam corretamente
- [ ] Dados são enviados corretamente para a API
- [ ] Tela de confirmação exibe dados corretos

### Visual
- [ ] Header mostra logo/avatar + nome + endereço
- [ ] Bloco de boas-vindas com título e subtítulo
- [ ] Badges de confiança visíveis
- [ ] Progress bar minimalista funcionando
- [ ] Cards de serviço com emoji e descrição
- [ ] Footer sticky com CTA aparece após seleção
- [ ] Estados de loading com skeleton

### Responsivo
- [ ] Funciona em 320px de largura
- [ ] Thumb zone respeitado (CTAs na parte inferior)
- [ ] Scroll natural em todos os passos

---

## 🚀 Ordem de Execução

```
1. types.ts + constants.ts + utils.ts
   ↓
2. useBooking.ts (hook)
   ↓
3. Skeleton.tsx + ProgressBar.tsx + StickyFooter.tsx
   ↓
4. BookingHeader.tsx + WelcomeSection.tsx
   ↓
5. ServiceCard.tsx + ServiceList.tsx
   ↓
6. DatePicker.tsx + TimeSlots.tsx + ClientForm.tsx
   ↓
7. ConfirmationScreen.tsx
   ↓
8. Novo page.tsx (integração)
   ↓
9. Testes + Ajustes
```

---

## 📅 Changelog

| Data | Item | Status |
|------|------|--------|
| 2026-01-20 | Plano criado | ✅ |
| 2026-01-20 | types.ts + constants.ts + utils.ts | ✅ |
| 2026-01-20 | useBooking.ts hook | ✅ |
| 2026-01-20 | Skeleton + ProgressBar + StickyFooter | ✅ |
| 2026-01-20 | BookingHeader + WelcomeSection | ✅ |
| 2026-01-20 | ServiceCard + ServiceList | ✅ |
| 2026-01-20 | DatePicker + TimeSlots + ClientForm | ✅ |
| 2026-01-20 | ConfirmationScreen | ✅ |
| 2026-01-20 | Novo page.tsx (integração) | ✅ |
| 2026-01-20 | Build do container web | ✅ |
