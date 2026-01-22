# Guia de Testes da API

Este documento contém exemplos de comandos PowerShell para testar todos os endpoints da API.

## 1. Autenticação

### Signup (Criar workspace + usuário)

```powershell
$signupBody = '{"workspaceName":"Studio Exemplo","workspaceSlug":"studio-exemplo","name":"Maria Silva","email":"maria@exemplo.com","password":"Senha@123456"}'
Invoke-RestMethod -Uri http://localhost:3001/api/v1/auth/signup -Method Post -Body $signupBody -ContentType 'application/json' | ConvertTo-Json
```

### Login

```powershell
$loginBody = '{"email":"maria@exemplo.com","password":"Senha@123456"}'
$response = Invoke-RestMethod -Uri http://localhost:3001/api/v1/auth/login -Method Post -Body $loginBody -ContentType 'application/json'
$global:token = $response.accessToken
Write-Host "Token: $global:token"
```

### Obter dados do usuário autenticado

```powershell
$headers = @{Authorization = "Bearer $global:token"}
Invoke-RestMethod -Uri http://localhost:3001/api/v1/me -Method Get -Headers $headers | ConvertTo-Json
```

## 2. Serviços (Services)

### Criar serviço

```powershell
$serviceBody = '{"name":"Corte de Cabelo","description":"Corte masculino ou feminino","durationMinutes":45,"priceCents":5000}'
Invoke-RestMethod -Uri http://localhost:3001/api/v1/services -Method Post -Body $serviceBody -ContentType 'application/json' -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json
```

### Listar todos os serviços

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/v1/services -Method Get -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json -Depth 3
```

### Listar apenas serviços ativos

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/v1/services?active=true -Method Get -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json -Depth 3
```

### Obter um serviço específico

```powershell
$serviceId = "cmkipdfiu0001uhhgyd6r2g15"
Invoke-RestMethod -Uri http://localhost:3001/api/v1/services/$serviceId -Method Get -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json
```

### Atualizar serviço

```powershell
$serviceId = "cmkipdfiu0001uhhgyd6r2g15"
$updateBody = '{"description":"Corte moderno e estilizado","priceCents":6000}'
Invoke-RestMethod -Uri http://localhost:3001/api/v1/services/$serviceId -Method Put -Body $updateBody -ContentType 'application/json' -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json
```

### Desativar serviço

```powershell
$serviceId = "cmkipdfiu0001uhhgyd6r2g15"
$updateBody = '{"isActive":false}'
Invoke-RestMethod -Uri http://localhost:3001/api/v1/services/$serviceId -Method Put -Body $updateBody -ContentType 'application/json' -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json
```

### Deletar serviço

```powershell
$serviceId = "cmkipdfiu0001uhhgyd6r2g15"
Invoke-RestMethod -Uri http://localhost:3001/api/v1/services/$serviceId -Method Delete -Headers @{Authorization = "Bearer $global:token"}
```

## 3. Agendamentos (Appointments)

### Criar agendamento

```powershell
# Criar para amanhã às 14:00
$startDateTime = (Get-Date).AddDays(1).Date.AddHours(14).ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$serviceId = "cmkipdfiu0001uhhgyd6r2g15"
$apptBody = "{`"clientName`":`"João Silva`",`"clientPhone`":`"11987654321`",`"serviceIds`":[`"$serviceId`"],`"startAt`":`"$startDateTime`"}"
Invoke-RestMethod -Uri http://localhost:3001/api/v1/appointments -Method Post -Body $apptBody -ContentType 'application/json' -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json -Depth 5
```

### Listar agendamentos (próximos 7 dias)

```powershell
$from = (Get-Date).Date.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$to = (Get-Date).AddDays(7).Date.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/appointments?from=$from&to=$to" -Method Get -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json -Depth 4
```

### Listar apenas agendamentos confirmados

```powershell
$from = (Get-Date).Date.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$to = (Get-Date).AddDays(30).Date.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/appointments?from=$from&to=$to&status=CONFIRMED" -Method Get -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json -Depth 4
```

### Obter um agendamento específico

```powershell
$appointmentId = "cmkipjxxw0001smd0rcm6b6vq"
Invoke-RestMethod -Uri http://localhost:3001/api/v1/appointments/$appointmentId -Method Get -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json -Depth 5
```

### Cancelar agendamento

```powershell
$appointmentId = "cmkipjxxw0001smd0rcm6b6vq"
$cancelBody = '{"cancelledBy":"PROFESSIONAL"}'
Invoke-RestMethod -Uri http://localhost:3001/api/v1/appointments/$appointmentId/cancel -Method Put -Body $cancelBody -ContentType 'application/json' -Headers @{Authorization = "Bearer $global:token"} | ConvertTo-Json -Depth 5
```

## 4. Validações e Erros

### Teste de conflito de horário (deve retornar 409)

```powershell
# Usar mesmo horário de um agendamento existente
$conflictDate = '2026-01-18T16:36:08.728Z'
$serviceId = "cmkipdyoq0003uhhgwcs0hqo6"
$apptBody = "{`"clientName`":`"Maria Santos`",`"clientPhone`":`"11912345678`",`"serviceIds`":[`"$serviceId`"],`"startAt`":`"$conflictDate`"}"
try {
    Invoke-RestMethod -Uri http://localhost:3001/api/v1/appointments -Method Post -Body $apptBody -ContentType 'application/json' -Headers @{Authorization = "Bearer $global:token"}
} catch {
    Write-Host "ERRO ESPERADO: $($_.Exception.Message)"
}
```

### Teste de nome de serviço duplicado (deve retornar 400)

```powershell
$serviceBody = '{"name":"Corte de Cabelo","description":"Teste duplicado","durationMinutes":30,"priceCents":3000}'
try {
    Invoke-RestMethod -Uri http://localhost:3001/api/v1/services -Method Post -Body $serviceBody -ContentType 'application/json' -Headers @{Authorization = "Bearer $global:token"}
} catch {
    Write-Host "ERRO ESPERADO: $($_.Exception.Message)"
}
```

### Teste de token expirado/inválido (deve retornar 401)

```powershell
$invalidHeaders = @{Authorization = "Bearer token.invalido.aqui"}
try {
    Invoke-RestMethod -Uri http://localhost:3001/api/v1/services -Method Get -Headers $invalidHeaders
} catch {
    Write-Host "ERRO ESPERADO: $($_.Exception.Message)"
}
```

## 5. Health Check

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/v1/health -Method Get | ConvertTo-Json
```

## Notas

- **Autenticação**: Todos os endpoints (exceto `/health`, `/auth/signup` e `/auth/login`) requerem JWT Bearer token no header `Authorization`.
- **Token JWT**: Expira em 15 minutos (configurável via `.env` - `JWT_EXPIRES_IN`).
- **Workspace**: Todos os dados são isolados por `workspaceId` extraído do token JWT.
- **Datas**: Use formato ISO 8601 com timezone UTC (ex.: `2026-01-18T16:36:08.728Z`).
- **Preços**: Sempre em centavos (ex.: `5000` = R$ 50,00).
- **Duração**: Sempre em minutos.

## Status HTTP

- **200**: OK
- **201**: Criado
- **400**: Bad Request (validação falhou)
- **401**: Unauthorized (sem token ou token inválido)
- **404**: Not Found
- **409**: Conflict (ex.: agendamento no mesmo horário)
- **500**: Internal Server Error
