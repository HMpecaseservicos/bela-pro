# Modelagem do banco (PostgreSQL)

## Multi-tenant

- **Workspace** é o tenant.
- Todas as entidades operacionais carregam `workspaceId`.

## Entidades principais

- Workspace
- User (owner/staff)
- ProfessionalProfile (dados do negócio / profissional)
- Service + ServiceBundle (combinações)
- Client
- Appointment + AppointmentService
- ScheduleRule (horários por dia da semana) + TimeOff + ManualBlock
- ChatbotConversation + ChatbotMessage + ChatbotTemplate
- NotificationJob (lembretes)
- AuditLog

## Índices e constraints (essenciais)

- Uniqueness: `workspace.slug` único global
- `client.phoneE164` único por workspace
- `appointment` sem overlaps via checagem de disponibilidade na app (e opcional: constraint avançada com tstzrange)

> O schema Prisma completo fica em [prisma/schema.prisma](../prisma/schema.prisma)
