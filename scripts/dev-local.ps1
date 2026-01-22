#requires -Version 5.1
<#
.SYNOPSIS
  Desenvolvimento LOCAL otimizado - Hot reload instantâneo!
  
.DESCRIPTION
  - Docker: apenas postgres + redis (infraestrutura)
  - Local: Next.js + NestJS com hot-reload
  - Build: ~3 segundos vs ~2 minutos no Docker
  
.EXAMPLE
  .\scripts\dev-local.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

function Write-Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg) { Write-Host "[ok] $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }

# ============================================
# 1. Subir apenas infraestrutura no Docker
# ============================================
Write-Step "Subindo infraestrutura (postgres + redis)"
docker compose up -d postgres redis

# Aguardar postgres ficar healthy
Write-Step "Aguardando Postgres..."
$timeout = 30
$elapsed = 0
while ($elapsed -lt $timeout) {
    $health = docker inspect --format='{{.State.Health.Status}}' agenda-postgres-1 2>$null
    if ($health -eq 'healthy') {
        Write-Ok "Postgres healthy!"
        break
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
}

# ============================================
# 2. Instalar dependências se necessário
# ============================================
if (-not (Test-Path "node_modules")) {
    Write-Step "Instalando dependencias (npm install)..."
    npm install
}

# ============================================
# 3. Gerar Prisma Client local
# ============================================
Write-Step "Gerando Prisma Client"
npx prisma generate --schema=./prisma/schema.prisma

Write-Step "Aplicando migrations ao banco"
npx prisma db push --schema=./prisma/schema.prisma --skip-generate

# ============================================
# 4. Iniciar apps em paralelo
# ============================================
Write-Step "Iniciando API (NestJS) e Web (Next.js) em paralelo"
Write-Host ""
Write-Host "  API:  http://localhost:3001" -ForegroundColor Green
Write-Host "  Web:  http://localhost:3000" -ForegroundColor Green
Write-Host "  DB:   postgresql://bela:bela123@localhost:5432/bela_pro" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Hot-reload ativo! Edite e salve para ver mudancas instantaneas." -ForegroundColor Yellow
Write-Host "  Pressione CTRL+C para parar." -ForegroundColor DarkGray
Write-Host ""

# Usar npm run dev do monorepo (roda api e web em paralelo)
npm run dev
