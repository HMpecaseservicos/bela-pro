# 🏗️ ARQUITETURA DE INTEGRAÇÃO: Painel Admin ↔ Página Pública

## 📊 DIAGNÓSTICO DO ESTADO ATUAL

### ✅ O que já está funcionando corretamente:

| Componente | Status | Descrição |
|------------|--------|-----------|
| `GET /workspace/by-slug/:slug` | ✅ OK | Retorna dados básicos do workspace |
| `GET /workspace/:id/services` | ✅ OK | Lista serviços ativos (`isActive: true`) |
| `GET /availability/days` | ✅ OK | Busca dias com slots disponíveis |
| `GET /availability/slots` | ✅ OK | Retorna slots baseados em ScheduleRule + TimeOff + Appointments |
| `POST /public-booking` | ✅ OK | Cria agendamento com validação de conflito (HTTP 409) |
| Multi-tenancy | ✅ OK | Todas as queries filtram por `workspaceId` |
| Frontend `/[slug]/booking` | ✅ OK | Fluxo 4 etapas: Serviço → Data → Horário → Dados |

### ⚠️ GAPS IDENTIFICADOS (Painel NÃO controla):

| Item | Problema | Impacto |
|------|----------|---------|
| **Ordem de serviços** | Ordenados por nome, não por posição | Admin não controla ordem de exibição |
| **Serviços públicos vs privados** | Não há flag `showInBooking` | Alguns serviços deveriam ser só internos |
| **Textos da página** | Hardcoded no frontend | "Escolha um serviço" fixo, não customizável |
| **Cor principal** | Não aplicada | `primaryColorHex` existe mas frontend usa `#667eea` fixo |
| **Mensagem de boas-vindas** | Não existe campo | Admin não pode customizar |
| **Slot interval** | Hardcoded 15min | Admin não pode escolher 30min, 1h etc |
| **Buffer entre agendamentos** | `bufferMinutes` ignorado | Slots não respeitam tempo de preparo |
| **Lead time mínimo** | `minLeadTimeMinutes` ignorado | Cliente pode agendar daqui 5min |
| **Limite de dias futuros** | `maxBookingDaysAhead` ignorado | Cliente pode agendar 1 ano à frente |
| **Logo** | Campo não existe | Não há upload de logo |

---

## 🎯 ARQUITETURA PROPOSTA

### Princípio Central:
> **"O Backend é a ÚNICA fonte de verdade. O Frontend apenas renderiza."**

```
┌─────────────────────────────────────────────────────────────────┐
│                     PAINEL ADMINISTRATIVO                        │
│  /dashboard/servicos  /dashboard/horarios  /dashboard/aparencia │
└────────────────────────────┬────────────────────────────────────┘
                             │ 
                             ▼ (CRUD autenticado)
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND API                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Services   │  │ ScheduleRule │  │   Workspace Config   │   │
│  │  isActive    │  │ dayOfWeek    │  │  primaryColorHex     │   │
│  │  showPublic  │  │ startMinutes │  │  welcomeMessage      │   │
│  │  sortOrder   │  │ endMinutes   │  │  bufferMinutes       │   │
│  └──────────────┘  └──────────────┘  │  minLeadTimeMinutes  │   │
│                                       │  slotIntervalMinutes │   │
│                                       └──────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼ (API Pública read-only)
┌─────────────────────────────────────────────────────────────────┐
│               PÁGINA PÚBLICA DE AGENDAMENTO                      │
│                      /[slug]/booking                             │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  100% DINÂMICO - Nenhum texto hardcoded                 │   │
│   │  Cores vêm do workspace.primaryColorHex                 │   │
│   │  Textos vêm do workspace.welcomeMessage                 │   │
│   │  Serviços filtrados por isActive + showInBooking        │   │
│   │  Slots gerados com bufferMinutes + minLeadTime          │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 PLANO DE IMPLEMENTAÇÃO

### FASE 1: Ajustes no Schema (Prisma)

```prisma
// Adicionar ao model Workspace:
welcomeText     String?  // "Agende seu horário conosco!"
description     String?  // Descrição do negócio
slotIntervalMinutes Int @default(15) // 15, 30, 60

// Adicionar ao model Service:
showInBooking   Boolean @default(true) // Exibir na página pública?
sortOrder       Int     @default(0)    // Ordem de exibição
```

**Comando:**
```bash
npx prisma migrate dev --name add_booking_config
```

---

### FASE 2: Ajustes no Backend

#### 2.1 Endpoint: GET /workspace/by-slug/:slug (EXPANDIR)

**Arquivo:** `apps/api/src/workspace/workspace.service.ts`

```typescript
async findBySlug(slug: string) {
  const workspace = await this.prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      // Identidade Visual
      brandName: true,
      primaryColorHex: true,
      // Textos customizáveis
      welcomeText: true,        // NOVO
      description: true,        // NOVO
      // Regras de agendamento
      minLeadTimeMinutes: true,
      bufferMinutes: true,
      maxBookingDaysAhead: true,
      slotIntervalMinutes: true, // NOVO
      // Profile
      profile: {
        select: {
          displayName: true,
          addressLine: true,
          phoneE164: true,
        }
      }
    }
  });

  if (!workspace) throw new NotFoundException('Workspace não encontrado.');
  return workspace;
}
```

**Response esperado:**
```json
{
  "id": "clxxx",
  "name": "Meu Salão",
  "slug": "meu-salao",
  "brandName": "Studio da Ana",
  "primaryColorHex": "#A855F7",
  "welcomeText": "Agende seu horário conosco!",
  "description": "Salão especializado em...",
  "minLeadTimeMinutes": 120,
  "bufferMinutes": 10,
  "maxBookingDaysAhead": 60,
  "slotIntervalMinutes": 30,
  "profile": { ... }
}
```

---

#### 2.2 Endpoint: GET /workspace/:id/services (AJUSTAR)

**Arquivo:** `apps/api/src/workspace/workspace.service.ts`

```typescript
async getPublicServices(workspaceId: string) {
  return this.prisma.service.findMany({
    where: {
      workspaceId,
      isActive: true,
      showInBooking: true, // NOVO - apenas serviços públicos
    },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceCents: true,
    },
    orderBy: {
      sortOrder: 'asc', // NOVO - ordenar por posição
    },
  });
}
```

---

#### 2.3 Availability: Respeitar Regras do Workspace

**Arquivo:** `apps/api/src/availability/availability.service.ts`

```typescript
async getAvailableSlots(workspaceId: string, serviceId: string, date: string) {
  // 1. Buscar workspace para pegar configurações
  const workspace = await this.prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      minLeadTimeMinutes: true,
      bufferMinutes: true,
      maxBookingDaysAhead: true,
      slotIntervalMinutes: true,
    }
  });

  // 2. Validar maxBookingDaysAhead
  const targetDate = new Date(date);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + workspace.maxBookingDaysAhead);
  if (targetDate > maxDate) {
    return []; // Data muito distante
  }

  // 3. Usar slotIntervalMinutes do workspace (não hardcoded)
  const slotIntervalMinutes = workspace.slotIntervalMinutes || 15;

  // 4. Aplicar minLeadTimeMinutes
  const now = new Date();
  const minStartTime = new Date(now.getTime() + workspace.minLeadTimeMinutes * 60000);

  // 5. Aplicar bufferMinutes nos conflitos
  const appointments = await this.prisma.appointment.findMany({
    where: {
      workspaceId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      // Expandir range com buffer
      startAt: { gte: startOfDay },
      endAt: { lte: endOfDay },
    },
  });

  // Ao verificar conflito, adicionar buffer:
  const hasConflict = appointments.some(appt => {
    const apptEndWithBuffer = new Date(appt.endAt.getTime() + workspace.bufferMinutes * 60000);
    return slotStart < apptEndWithBuffer && slotEnd > appt.startAt;
  });

  // 6. Validar minLeadTime
  if (slotStart < minStartTime) {
    continue; // Slot não respeita antecedência mínima
  }
}
```

---

### FASE 3: Ajustes no Frontend

#### 3.1 Página Pública: Usar Configurações Dinâmicas

**Arquivo:** `apps/web/src/app/[slug]/booking/page.tsx`

**Mudanças principais:**

```tsx
// 1. Expandir interface Workspace
interface Workspace {
  id: string;
  name: string;
  brandName: string | null;
  primaryColorHex: string | null;  // Usar para cores
  welcomeText: string | null;       // Usar para textos
  description: string | null;
  profile: { ... } | null;
}

// 2. Aplicar cor dinâmica
const primaryColor = workspace?.primaryColorHex || '#667eea';

// 3. Usar CSS variables ou inline styles
<div style={{ 
  background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -20)} 100%)`
}}>

// 4. Textos dinâmicos
<h2>{workspace?.welcomeText || 'Escolha um serviço'}</h2>

// 5. Remover TODOS os textos hardcoded
// ANTES: "Escolha um serviço"
// DEPOIS: workspace.serviceSelectionText || 'Escolha um serviço'
```

---

### FASE 4: Painel Admin - Conectar ao Backend

#### 4.1 Página Aparência: Salvar Configurações

**Arquivo:** `apps/web/src/app/dashboard/aparencia/page.tsx`

```tsx
// Ao salvar, chamar:
await fetch(`${API_URL}/workspace/${workspaceId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    brandName,
    primaryColorHex: selectedColor,
    welcomeText,
    description,
  })
});
```

#### 4.2 Página Serviços: Adicionar showInBooking + sortOrder

```tsx
// Adicionar toggle "Exibir no agendamento online"
<label>
  <input 
    type="checkbox" 
    checked={service.showInBooking} 
    onChange={e => updateService(service.id, { showInBooking: e.target.checked })}
  />
  Exibir na página de agendamento
</label>

// Adicionar drag-and-drop para reordenar
```

#### 4.3 Página Configurações: Regras de Agendamento

```tsx
// Adicionar campos:
<label>Intervalo entre horários</label>
<select value={slotIntervalMinutes} onChange={...}>
  <option value={15}>15 minutos</option>
  <option value={30}>30 minutos</option>
  <option value={60}>1 hora</option>
</select>

<label>Antecedência mínima (minutos)</label>
<input type="number" value={minLeadTimeMinutes} />

<label>Buffer entre agendamentos (minutos)</label>
<input type="number" value={bufferMinutes} />

<label>Agendar com até X dias de antecedência</label>
<input type="number" value={maxBookingDaysAhead} />
```

---

## 🔌 CONTRATO DE API COMPLETO

### Endpoints Públicos (sem autenticação):

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/workspace/by-slug/:slug` | Dados do workspace + config visual |
| GET | `/workspace/:id/services` | Serviços ativos e públicos |
| GET | `/availability/days` | Dias com disponibilidade |
| GET | `/availability/slots` | Slots de um dia específico |
| POST | `/public-booking` | Criar agendamento |

### Endpoints Autenticados (painel admin):

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| PATCH | `/workspace/:id` | Atualizar configurações |
| POST | `/services` | Criar serviço |
| PATCH | `/services/:id` | Atualizar serviço |
| DELETE | `/services/:id` | Deletar serviço |
| POST | `/schedule-rules` | Criar regra de horário |
| DELETE | `/schedule-rules/:id` | Deletar regra |
| POST | `/time-off` | Criar folga |
| DELETE | `/time-off/:id` | Deletar folga |

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Schema (Prisma):
- [ ] Adicionar `welcomeText` ao Workspace
- [ ] Adicionar `description` ao Workspace  
- [ ] Adicionar `slotIntervalMinutes` ao Workspace
- [ ] Adicionar `showInBooking` ao Service
- [ ] Adicionar `sortOrder` ao Service
- [ ] Rodar migration

### Backend:
- [ ] Expandir retorno de `findBySlug` com novos campos
- [ ] Filtrar serviços por `showInBooking: true`
- [ ] Ordenar serviços por `sortOrder`
- [ ] Aplicar `minLeadTimeMinutes` em availability
- [ ] Aplicar `bufferMinutes` em availability
- [ ] Aplicar `maxBookingDaysAhead` em availability
- [ ] Usar `slotIntervalMinutes` dinâmico
- [ ] Criar endpoint PATCH `/workspace/:id`

### Frontend Público:
- [ ] Remover cores hardcoded (usar `primaryColorHex`)
- [ ] Remover textos hardcoded (usar campos do workspace)
- [ ] Criar função `adjustColor()` para gradientes

### Frontend Admin:
- [ ] Conectar página Aparência ao backend
- [ ] Adicionar toggle `showInBooking` em Serviços
- [ ] Adicionar reordenação de serviços
- [ ] Adicionar campos de regras em Configurações

---

## 🛡️ GARANTIAS DE SEGURANÇA

1. **Multi-tenancy**: Toda query filtra por `workspaceId`
2. **Validação de slug**: Workspace validado antes de qualquer operação
3. **Conflito de horário**: HTTP 409 se slot ocupado
4. **Dados do frontend**: Nunca confiados, sempre revalidados no backend
5. **Rate limiting**: Implementar no public-booking (futuro)

---

## 📈 ESCALABILIDADE

Esta arquitetura suporta:
- ✅ Milhares de workspaces independentes
- ✅ Configurações 100% isoladas por tenant
- ✅ Frontend stateless (pode ser cacheado em CDN)
- ✅ Backend stateless (horizontal scaling)
- ✅ Queries otimizadas com índices por workspaceId

---

## 🚀 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Migração do Schema** (5 min)
2. **Backend: availability com regras** (30 min)
3. **Backend: workspace expandido** (15 min)
4. **Backend: services filtrado** (10 min)
5. **Frontend público: cores dinâmicas** (20 min)
6. **Frontend público: textos dinâmicos** (15 min)
7. **Frontend admin: conectar aparência** (30 min)
8. **Frontend admin: conectar serviços** (20 min)
9. **Frontend admin: conectar config** (20 min)
10. **Testes E2E** (30 min)

**Tempo total estimado: ~3 horas**
