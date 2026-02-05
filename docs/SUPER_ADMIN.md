# Super Admin API

Sistema de administração global para gerenciamento de todos os workspaces e usuários do BELA PRO.

## Visão Geral

O Super Admin é um usuário especial com acesso irrestrito a todas as funcionalidades do sistema, incluindo:

- Dashboard com estatísticas globais
- Gerenciamento de todos os workspaces
- Gerenciamento de todos os usuários
- Controle de billing e uso de chat
- Logs de auditoria globais
- Impersonar qualquer workspace
- Métricas de crescimento
- Exportação de dados (CSV/JSON)
- Notificações broadcast
- Health check do sistema

## Autenticação

Super Admins usam o mesmo endpoint de login (`/api/v1/auth/login`), mas recebem um token JWT com `isSuperAdmin: true`.

```json
// Response de login para Super Admin
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "isSuperAdmin": true
}
```

## Como Criar um Super Admin

### Via Script CLI (Recomendado)

```bash
# Com prompts interativos
npx ts-node scripts/create-super-admin.ts

# Com argumentos
npx ts-node scripts/create-super-admin.ts \
  --email=admin@bela-pro.com \
  --name="Super Admin" \
  --password=suaSenhaForte123
```

### Via SQL

```sql
-- Promover usuário existente
UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'admin@exemplo.com';
```

### Via API (requer Super Admin existente)

```bash
POST /api/v1/admin/users/super-admin
Authorization: Bearer <token_super_admin>
Content-Type: application/json

{
  "name": "Novo Admin",
  "email": "novo@bela-pro.com",
  "password": "senhaForte123"
}
```

---

## Endpoints

### Dashboard

#### `GET /api/v1/admin/dashboard`

Retorna estatísticas gerais do sistema.

**Response:**
```json
{
  "overview": {
    "totalWorkspaces": 150,
    "activeWorkspaces": 142,
    "totalUsers": 280,
    "activeUsers": 265,
    "totalAppointments": 12500,
    "appointmentsThisMonth": 1847
  },
  "workspacesByPlan": {
    "FREE": 45,
    "BASIC": 80,
    "PRO": 20,
    "ENTERPRISE": 5
  },
  "recentWorkspaces": [...]
}
```

---

### Health Check

#### `GET /api/v1/admin/health`

Retorna status de saúde do sistema.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-05T14:30:00Z",
  "components": {
    "database": "healthy",
    "whatsapp": { "connectedWorkspaces": 45 },
    "chatbot": { "activeConversations24h": 230 },
    "notifications": { "pending": 15 }
  }
}
```

---

### Métricas de Crescimento

#### `GET /api/v1/admin/metrics/growth`

Retorna métricas de crescimento por período.

**Query params:**
- `period`: `week` | `month` | `quarter` | `year` (default: month)

**Response:**
```json
{
  "period": "month",
  "startDate": "2026-02-01T00:00:00Z",
  "endDate": "2026-02-05T14:30:00Z",
  "metrics": {
    "workspaces": { "current": 25, "previous": 18, "growth": 39 },
    "users": { "current": 42, "previous": 35, "growth": 20 },
    "appointments": { "current": 1847, "previous": 1520, "growth": 22 },
    "clients": { "current": 380, "previous": 310, "growth": 23 }
  },
  "topWorkspaces": [...],
  "appointmentsByStatus": {
    "CONFIRMED": 1200,
    "COMPLETED": 500,
    "CANCELLED": 147
  }
}
```

---

### Impersonar Workspace

#### `POST /api/v1/admin/impersonate/:workspaceId`

Gera token temporário para super admin acessar qualquer workspace como owner.

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "workspace": { "id": "...", "name": "Studio Maria", "slug": "studio-maria" },
  "expiresIn": 3600,
  "warning": "Este token é temporário e dá acesso total ao workspace."
}
```

> ⚠️ Use com responsabilidade! Este token dá acesso total ao workspace.

---

### Workspaces

#### `GET /api/v1/admin/workspaces`

Lista todos os workspaces com paginação.

**Query params:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` (busca por nome ou slug)

#### `GET /api/v1/admin/workspaces/:id`

Retorna detalhes completos de um workspace.

#### `PATCH /api/v1/admin/workspaces/:id`

Atualiza configurações administrativas.

**Body:**
```json
{
  "name": "Novo Nome",
  "plan": "PRO",
  "chatbotEnabled": true
}
```

#### `DELETE /api/v1/admin/workspaces/:id`

Desativa um workspace (soft delete).

---

### Gerenciamento de Planos

#### `GET /api/v1/admin/plans`

Retorna configuração de limites por plano.

**Response:**
```json
{
  "FREE": {
    "conversationsLimit": 50,
    "features": ["basic_booking"]
  },
  "BASIC": {
    "conversationsLimit": 500,
    "features": ["basic_booking", "chatbot", "reminders"]
  },
  "PRO": {
    "conversationsLimit": 2000,
    "features": ["basic_booking", "chatbot", "reminders", "reports", "priority_support"]
  },
  "ENTERPRISE": {
    "conversationsLimit": -1,
    "features": ["all"]
  }
}
```

#### `POST /api/v1/admin/plans/bulk-update`

Atualiza plano de múltiplos workspaces de uma vez.

**Body:**
```json
{
  "workspaceIds": ["clxyz...", "clabc..."],
  "plan": "PRO"
}
```

---

### Usuários

#### `GET /api/v1/admin/users`

Lista todos os usuários.

**Query params:** `page`, `limit`, `search`

#### `GET /api/v1/admin/users/:id`

Retorna detalhes de um usuário, incluindo memberships e últimos audit logs.

#### `PATCH /api/v1/admin/users/:id`

Atualiza dados de um usuário.

**Body:**
```json
{
  "name": "Novo Nome",
  "email": "novo@email.com",
  "isActive": true,
  "isSuperAdmin": false
}
```

> ⚠️ Não é possível remover seu próprio status de Super Admin.

#### `POST /api/v1/admin/users/super-admin`

Cria um novo Super Admin.

---

### Billing / Uso

#### `GET /api/v1/admin/billing/usage`

Lista uso de chat por workspace (mês atual).

#### `PATCH /api/v1/admin/billing/workspaces/:id/limit`

Ajusta limite de conversas para um workspace.

**Body:**
```json
{ "limit": 1000 }
```

---

### Exportação de Dados

#### `GET /api/v1/admin/export/workspaces`

Exporta lista de workspaces em formato CSV (download direto).

#### `GET /api/v1/admin/export/workspaces/json`

Exporta lista de workspaces em formato JSON.

#### `GET /api/v1/admin/export/users`

Exporta lista de usuários em formato CSV (download direto).

#### `GET /api/v1/admin/export/users/json`

Exporta lista de usuários em formato JSON.

---

### Notificações Broadcast

#### `GET /api/v1/admin/broadcast/targets`

Lista todos os owners de workspace para broadcast.

**Response:**
```json
[
  {
    "userId": "cl...",
    "userName": "Maria Silva",
    "userEmail": "maria@studio.com",
    "workspaceId": "cl...",
    "workspaceName": "Studio Maria",
    "workspacePlan": "BASIC"
  }
]
```

#### `POST /api/v1/admin/broadcast`

Cria uma notificação broadcast.

**Body:**
```json
{
  "title": "Nova funcionalidade!",
  "message": "Agora você pode usar templates personalizados.",
  "targetPlans": ["BASIC", "PRO", "ENTERPRISE"],
  "scheduledAt": "2026-02-10T10:00:00Z"
}
```

---

### Audit Logs

#### `GET /api/v1/admin/audit-logs`

Lista logs de auditoria globais.

**Query params:** `page`, `limit`

---

## Segurança

- Todos os endpoints admin requerem `JwtAuthGuard` + `SuperAdminGuard`
- Super Admins podem logar sem pertencer a nenhum workspace
- Super Admins têm bypass automático no `RolesGuard`
- Não é possível remover seu próprio status de Super Admin
- Tokens de impersonation são temporários (1h por padrão)
- Todas as ações podem ser auditadas via AuditLog

## Resumo de Endpoints

| Categoria | Método | Endpoint | Descrição |
|-----------|--------|----------|-----------|
| Dashboard | GET | `/dashboard` | Estatísticas globais |
| Health | GET | `/health` | Status do sistema |
| Métricas | GET | `/metrics/growth` | Crescimento por período |
| Impersonate | POST | `/impersonate/:id` | Acessar workspace |
| Workspaces | GET | `/workspaces` | Listar |
| Workspaces | GET | `/workspaces/:id` | Detalhes |
| Workspaces | PATCH | `/workspaces/:id` | Atualizar |
| Workspaces | DELETE | `/workspaces/:id` | Desativar |
| Planos | GET | `/plans` | Configurações |
| Planos | POST | `/plans/bulk-update` | Atualizar em massa |
| Users | GET | `/users` | Listar |
| Users | GET | `/users/:id` | Detalhes |
| Users | PATCH | `/users/:id` | Atualizar |
| Users | POST | `/users/super-admin` | Criar super admin |
| Billing | GET | `/billing/usage` | Uso de chat |
| Billing | PATCH | `/billing/workspaces/:id/limit` | Ajustar limite |
| Export | GET | `/export/workspaces` | CSV workspaces |
| Export | GET | `/export/users` | CSV usuários |
| Broadcast | GET | `/broadcast/targets` | Listar targets |
| Broadcast | POST | `/broadcast` | Criar notificação |
| Audit | GET | `/audit-logs` | Logs globais |

---

## Planos de Workspace

| Plano | Conversas/mês | Funcionalidades |
|-------|---------------|-----------------|
| FREE | 50 | Básico |
| BASIC | 500 | Chatbot, Lembretes |
| PRO | 2000 | Tudo + Relatórios + Suporte prioritário |
| ENTERPRISE | Ilimitado | Customizado |
