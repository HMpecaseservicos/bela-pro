# 🎯 BELA PRO — Modelo Freemium & Sponsors

> Proposta Ultra Profissional de Monetização

---

## 📊 Resumo Executivo

O BELA PRO adota um modelo **Freemium com Monetização Híbrida**:

| Fonte de Receita | Descrição |
|------------------|-----------|
| **Sponsors Globais** | Marcas pagam para aparecer em TODAS as páginas de booking (usuários gratuitos) |
| **Assinaturas Premium** | Profissionais pagam para remover anúncios + recursos exclusivos |
| **Sponsors Locais** | Assinantes podem vender espaço publicitário próprio (receita deles) |

---

## 🏗️ Arquitetura do Sistema

### Fluxo Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN                                  │
│   ┌───────────────────────────────────────────────────────────┐    │
│   │  Sponsors GLOBAIS (Diamond, Gold, Silver, Bronze)         │    │
│   │  - Aparecem em TODOS os workspaces FREE                   │    │
│   │  - Contratos, pagamentos, tracking de views/clicks        │    │
│   │  - Dashboard exclusivo para Diamond sponsors              │    │
│   └───────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WORKSPACES                                     │
│                                                                     │
│   ┌─────────────────────┐      ┌─────────────────────────────────┐ │
│   │   PLANO GRATUITO    │      │      PLANO PREMIUM (ASSINANTE)  │ │
│   │                     │      │                                 │ │
│   │ ✅ Agenda básica    │      │ ✅ Agenda completa              │ │
│   │ ✅ Clientes (50)    │      │ ✅ Clientes ilimitados          │ │
│   │ ✅ Serviços (5)     │      │ ✅ Serviços ilimitados          │ │
│   │ ✅ Booking público  │      │ ✅ Booking personalizado        │ │
│   │                     │      │ ✅ Chatbot WhatsApp             │ │
│   │ ❌ Chatbot          │      │ ✅ Financeiro completo          │ │
│   │ ❌ Financeiro       │      │ ✅ Equipe multi-usuário         │ │
│   │ ❌ Equipe           │      │ ✅ Relatórios avançados         │ │
│   │                     │      │                                 │ │
│   │ 📢 MOSTRA ANÚNCIOS  │      │ 🚫 SEM ANÚNCIOS GLOBAIS        │ │
│   │    GLOBAIS          │      │                                 │ │
│   │                     │      │ ✨ PODE CRIAR SEUS PRÓPRIOS    │ │
│   │                     │      │    PATROCINADORES LOCAIS        │ │
│   └─────────────────────┘      └─────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 💎 Níveis de Sponsor (Tiers)

### Sponsors GLOBAIS (Super Admin)

| Tier | Visibilidade | Recursos | Preço Sugerido |
|------|--------------|----------|----------------|
| 💎 **DIAMOND** | Destaque máximo | Card premium, carrossel de posts, CTA destacado, dashboard próprio | R$ 2.000/mês |
| 🥇 **GOLD** | Alta | Card com borda dourada, logo grande | R$ 800/mês |
| 🥈 **SILVER** | Média | Badge com logo médio | R$ 300/mês |
| 🥉 **BRONZE** | Básica | Texto com link | R$ 100/mês |

### Sponsors LOCAIS (Assinantes)

| Tier | Aparece em | Recursos |
|------|------------|----------|
| 💎 **DIAMOND** | Página de booking do workspace | Card premium, posts |
| 🥇 **GOLD** | Página de booking do workspace | Card destacado |
| 🥈 **SILVER** | Página de booking do workspace | Badge com logo |
| 🥉 **BRONZE** | Página de booking do workspace | Texto com link |

**Benefício para o assinante:** Pode monetizar sua própria audiência vendendo espaços para marcas locais!

---

## 🎫 Estrutura de Planos

### Plano Gratuito (FREE)

```yaml
Nome: "Gratuito"
Preço: R$ 0

Recursos:
  - Agenda básica
  - Até 50 clientes
  - Até 5 serviços
  - Página de booking pública
  
Limitações:
  - Exibe sponsors GLOBAIS (não pode desativar)
  - Sem chatbot/WhatsApp
  - Sem módulo financeiro
  - Sem equipe (apenas 1 usuário)
  - Sem relatórios avançados

Sponsors Locais: ❌ Não disponível
```

### Plano Profissional (PRO)

```yaml
Nome: "Profissional"
Preço: R$ 49,90/mês | R$ 39,90/mês (anual)

Recursos:
  - Tudo do Gratuito +
  - Clientes ilimitados
  - Serviços ilimitados
  - Chatbot WhatsApp básico
  - Módulo financeiro
  - Até 3 membros na equipe
  - Relatórios básicos

Sponsors:
  - Sem anúncios GLOBAIS ✨
  - Pode criar até 2 sponsors LOCAIS
```

### Plano Business (BUSINESS)

```yaml
Nome: "Business"
Preço: R$ 99,90/mês | R$ 79,90/mês (anual)

Recursos:
  - Tudo do Profissional +
  - Equipe ilimitada
  - Chatbot avançado com IA
  - Pagamento PIX integrado
  - Lembretes automáticos
  - Relatórios avançados
  - Personalização completa

Sponsors:
  - Sem anúncios GLOBAIS ✨
  - Sponsors LOCAIS ilimitados
  - Acesso ao painel de Patrocinadores
```

### Plano Enterprise (ENTERPRISE)

```yaml
Nome: "Enterprise"
Preço: Sob consulta

Recursos:
  - Tudo do Business +
  - API personalizada
  - Suporte prioritário
  - Multi-locais
  - Integrações customizadas
  - White-label opcional
```

---

## 🖥️ Interface do Assinante — Módulo "Meus Patrocinadores"

### Localização no Dashboard

```
Dashboard (assinante)
├── 🏠 Início
├── 📅 Agenda
├── 👥 Clientes
├── 💰 Financeiro
├── ⚙️ Configurações
│   ├── Dados do negócio
│   ├── Aparência
│   ├── Integrações
│   └── 🎯 Meus Patrocinadores  ← NOVO (só para assinantes)
└── ...
```

### Telas do Módulo

#### 1. Lista de Patrocinadores

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Meus Patrocinadores                                         │
│                                                                 │
│  Adicione parceiros e marcas que aparecem na sua página de     │
│  agendamento. Uma forma de monetizar sua audiência!            │
│                                                    [+ Adicionar]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💎 DIAMOND                                               │   │
│  │ ┌─────────┐                                              │   │
│  │ │  LOGO   │  Salão da Maria                             │   │
│  │ │         │  Produtos de beleza profissional            │   │
│  │ └─────────┘  🟢 Ativo   👁️ 234 views   🖱️ 45 cliques    │   │
│  │                                          [Editar] [···] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🥇 GOLD                                                  │   │
│  │ ┌─────────┐                                              │   │
│  │ │  LOGO   │  Beleza Store                               │   │
│  │ │         │  Cosméticos premium                         │   │
│  │ └─────────┘  🟢 Ativo   👁️ 156 views   🖱️ 23 cliques    │   │
│  │                                          [Editar] [···] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📊 Resumo: 2 patrocinadores | 390 views | 68 cliques          │
│  💡 Plano Business: Patrocinadores ilimitados                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Adicionar/Editar Patrocinador

```
┌─────────────────────────────────────────────────────────────────┐
│  ➕ Novo Patrocinador                            [Cancelar] [✓] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Informações Básicas                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Nome da marca/parceiro *                                 │   │
│  │ [Salão da Maria                                        ] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Descrição curta                                          │   │
│  │ [Produtos de beleza profissional                       ] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Nível de Destaque                                              │
│  ┌────────────┬────────────┬────────────┬────────────┐         │
│  │ 💎 Diamond │ 🥇 Gold    │ 🥈 Silver  │ 🥉 Bronze  │         │
│  │  Premium   │  Destaque  │  Médio     │  Básico    │         │
│  │    [✓]     │    [ ]     │    [ ]     │    [ ]     │         │
│  └────────────┴────────────┴────────────┴────────────┘         │
│                                                                 │
│  Imagens                                                        │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │                   │  │                   │                  │
│  │   [Upload Logo]   │  │  [Upload Banner]  │  (opcional)      │
│  │                   │  │                   │                  │
│  └───────────────────┘  └───────────────────┘                  │
│                                                                 │
│  Link & Call-to-Action                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Website/Instagram                                        │   │
│  │ [https://instagram.com/salaodamaria                    ] │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Texto do botão (ex: "Ver produtos", "Conhecer")          │   │
│  │ [Ver produtos                                          ] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Status                                                         │
│  [✓] Ativo - Exibir na página de agendamento                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. Preview (Como aparece na página de booking)

```
┌─────────────────────────────────────────────────────────────────┐
│  👁️ Preview — Página de Agendamento                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    STUDIO BELLA                          │   │
│  │                  Agende seu horário                      │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ 💎 Parceiro Diamond                               │   │   │
│  │  │ ┌───────┐                                         │   │   │
│  │  │ │ LOGO  │ Salão da Maria                         │   │   │
│  │  │ │       │ Produtos de beleza profissional        │   │   │
│  │  │ └───────┘                   [Ver produtos →]     │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  │  [Selecione um serviço]                                  │   │
│  │  [Escolha data e horário]                                │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Lógica de Exibição de Sponsors

### Página de Booking Pública

```typescript
// Pseudo-código da lógica

async function getSponsorsForBookingPage(workspaceId: string) {
  const workspace = await getWorkspace(workspaceId);
  const subscription = await getSubscription(workspaceId);
  
  // 1. Determina se workspace é FREE ou PAID
  const isPremium = subscription?.status === 'ACTIVE' && subscription.plan?.tier >= 'PRO';
  
  // 2. Busca sponsors LOCAIS (se habilitado)
  let localSponsors = [];
  if (isPremium && workspace.localSponsorsEnabled) {
    localSponsors = await Sponsor.findMany({
      where: { workspaceId, scope: 'WORKSPACE', isActive: true }
    });
  }
  
  // 3. Busca sponsors GLOBAIS (apenas se FREE)
  let globalSponsors = [];
  if (!isPremium || workspace.showGlobalSponsors) {
    globalSponsors = await Sponsor.findMany({
      where: { scope: 'GLOBAL', isActive: true, contractValid: true }
    });
  }
  
  // 4. Prioridade: LOCAIS primeiro, depois GLOBAIS
  // Ordenados por tier: Diamond > Gold > Silver > Bronze
  return [...localSponsors, ...globalSponsors].sortByTier();
}
```

### Tabela de Comportamento

| Plano | Vê Sponsors Globais | Pode Criar Locais | Limite Locais |
|-------|---------------------|-------------------|---------------|
| FREE | ✅ Sim (obrigatório) | ❌ Não | 0 |
| PRO | ❌ Não (opcional) | ✅ Sim | 2 |
| BUSINESS | ❌ Não (opcional) | ✅ Sim | ∞ |
| ENTERPRISE | ❌ Não (opcional) | ✅ Sim | ∞ |

---

## 📈 Métricas & Analytics

### Para Super Admin (Sponsors Globais)

- Total de views por sponsor
- Total de cliques por sponsor
- CTR (Click-through rate)
- Distribuição por workspace (onde mais apareceu)
- Receita por sponsor

### Para Assinantes (Sponsors Locais)

- Views por patrocinador local
- Cliques por patrocinador local
- Performance comparativa entre patrocinadores
- Gráfico de evolução (últimos 30 dias)

---

## 💰 Projeção de Receita

### Cenário: 1.000 Workspaces

| Métrica | Valor |
|---------|-------|
| Workspaces FREE | 700 (70%) |
| Workspaces PRO | 200 (20%) |
| Workspaces BUSINESS | 80 (8%) |
| Workspaces ENTERPRISE | 20 (2%) |

### Receita Mensal Estimada

```
Assinaturas:
  - PRO (200 × R$49,90)          = R$ 9.980
  - BUSINESS (80 × R$99,90)      = R$ 7.992
  - ENTERPRISE (20 × R$299,90)   = R$ 5.998
  ────────────────────────────────────────
  Subtotal Assinaturas           = R$ 23.970

Sponsors Globais (exibidos em 700 FREE):
  - 2 Diamond (2 × R$2.000)      = R$ 4.000
  - 4 Gold (4 × R$800)           = R$ 3.200
  - 8 Silver (8 × R$300)         = R$ 2.400
  - 10 Bronze (10 × R$100)       = R$ 1.000
  ────────────────────────────────────────
  Subtotal Sponsors              = R$ 10.600

RECEITA TOTAL MENSAL            = R$ 34.570
RECEITA ANUAL PROJETADA         = R$ 414.840
```

---

## 🛠️ Implementação Técnica

### Mudanças no Schema (Prisma)

```prisma
// Adicionar campos ao SubscriptionPlan
model SubscriptionPlan {
  // ... campos existentes ...
  
  // Novos campos para sponsors
  hideGlobalSponsors   Boolean @default(false)  // Pode ocultar sponsors globais
  localSponsorsEnabled Boolean @default(false)  // Pode criar sponsors locais
  localSponsorsLimit   Int     @default(0)      // 0 = ilimitado
}
```

### Novos Endpoints API

```
# Workspace Sponsors (para assinantes)
GET    /api/v1/workspace/sponsors           # Lista sponsors do workspace
POST   /api/v1/workspace/sponsors           # Cria sponsor local
PUT    /api/v1/workspace/sponsors/:id       # Atualiza sponsor local
DELETE /api/v1/workspace/sponsors/:id       # Remove sponsor local
GET    /api/v1/workspace/sponsors/stats     # Estatísticas

# Verificar limites
GET    /api/v1/workspace/sponsors/limits    # { canCreate, used, limit }
```

### Novas Páginas Frontend

```
/dashboard/patrocinadores              # Lista de sponsors locais (assinantes)
/dashboard/patrocinadores/novo         # Criar novo sponsor
/dashboard/patrocinadores/:id          # Editar sponsor
```

### Guard de Acesso

```typescript
// Middleware para verificar se pode acessar módulo de sponsors

@Injectable()
export class LocalSponsorsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { workspaceId } = request.user;
    
    const subscription = await this.subscriptionService.getActive(workspaceId);
    
    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ForbiddenException('Recurso exclusivo para assinantes');
    }
    
    if (!subscription.plan.localSponsorsEnabled) {
      throw new ForbiddenException('Seu plano não inclui este recurso');
    }
    
    return true;
  }
}
```

---

## 📋 Checklist de Implementação

### Fase 1: Infraestrutura (Backend)
- [ ] Adicionar campos de sponsors ao SubscriptionPlan
- [ ] Criar migration para atualizar schema
- [ ] Implementar WorkspaceSponsorsController completo
- [ ] Criar validação de limites de sponsors por plano
- [ ] Atualizar lógica de exibição na página pública

### Fase 2: Interface Admin Global (Super Admin)
- [ ] Página de gerenciamento de planos com campos de sponsors
- [ ] Dashboard de sponsors globais com métricas

### Fase 3: Interface Assinante (Dashboard)
- [ ] Criar página /dashboard/patrocinadores
- [ ] Form de criação/edição de sponsor local
- [ ] Preview de como aparece na página
- [ ] Estatísticas básicas (views, cliques)
- [ ] Validação de limites do plano

### Fase 4: Página Pública de Booking
- [ ] Atualizar lógica para priorizar sponsors locais
- [ ] Ocultar sponsors globais para assinantes (se configurado)
- [ ] Tracking de views/cliques por sponsor

### Fase 5: Upgrade Flow
- [ ] Mensagem "Assine para remover anúncios"
- [ ] Botão de upgrade no modal de limite atingido
- [ ] Landing page de planos

---

## 🎯 Próximos Passos

1. **Aprovar proposta** — Confirmar modelo de negócio e planos
2. **Definir planos** — Criar planos no admin com configurações de sponsors
3. **Implementar backend** — APIs e lógica de negócio
4. **Criar interfaces** — Páginas para assinantes gerenciarem sponsors
5. **Testar fluxo completo** — FREE vs PAID, limites, exibição
6. **Go-live** — Ativar modelo freemium

---

> **Documento criado em:** 15/03/2026  
> **Versão:** 1.0  
> **Status:** Proposta para aprovação
