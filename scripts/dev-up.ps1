#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

function Write-Step([string]$msg) { Write-Host "\n==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg) { Write-Host "[ok] $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }

function Test-PendingReboot {
  $rebootKeys = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending',
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'
  )
  foreach ($key in $rebootKeys) {
    if (Test-Path $key) { return $true }
  }

  $sessionMgr = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager'
  $pendingRenames = Get-ItemProperty -Path $sessionMgr -Name PendingFileRenameOperations -ErrorAction SilentlyContinue
  return ($null -ne $pendingRenames)
}

Write-Step "Checando Docker"
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
$dockerExe = $null

if ($dockerCmd) {
  $dockerExe = $dockerCmd.Source
} else {
  $defaultDockerExe = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
  if (Test-Path $defaultDockerExe) {
    $dockerExe = $defaultDockerExe
    Write-Warn "Docker nao esta no PATH; usando caminho padrao do Docker Desktop."
  }
}

if (-not $dockerExe) {
  Write-Warn "Docker nao encontrado. Instale o Docker Desktop e reabra o terminal/VS Code."
  exit 2
}

function Invoke-Docker {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )
  & $dockerExe @Args
}

Write-Step "Checando Docker Engine"
Invoke-Docker -Args @('version')
if ($LASTEXITCODE -ne 0) {
  if (Test-PendingReboot) {
    Write-Warn "Reboot pendente detectado. Reinicie o Windows e tente novamente."
  }
  $dockerDesktopExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  if (Test-Path $dockerDesktopExe) {
    Write-Warn "Docker Engine nao esta acessivel. Tentando abrir o Docker Desktop e aguardando ficar pronto..."
    try {
      Start-Process -FilePath $dockerDesktopExe | Out-Null
    } catch {
      Write-Warn "Nao foi possivel iniciar o Docker Desktop automaticamente. Abra manualmente e reexecute."
      exit 3
    }

    $engineTimeoutSeconds = 180
    $engineSw = [Diagnostics.Stopwatch]::StartNew()
    while ($engineSw.Elapsed.TotalSeconds -lt $engineTimeoutSeconds) {
      Start-Sleep -Seconds 3
      Invoke-Docker -Args @('version') | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Write-Ok "Docker Engine OK"
        break
      }
    }

    if ($LASTEXITCODE -ne 0) {
      Write-Warn "Docker Engine ainda nao esta acessivel apos $engineTimeoutSeconds s. Verifique o Docker Desktop (Running) e reexecute."
      exit 3
    }
  } else {
    Write-Warn "Docker Engine nao esta acessivel. Abra o Docker Desktop (Running) e reexecute este script."
    exit 3
  }
}
if ($LASTEXITCODE -eq 0) {
  Write-Ok "Docker Engine OK"
}

Write-Step "Subindo stack (build + up)"
Invoke-Docker -Args @('compose','up','-d','--build')

Write-Step "Status dos servicos"
Invoke-Docker -Args @('compose','ps')

Write-Step "Rodando Prisma generate + migrate dentro do container da API"
Invoke-Docker -Args @('compose','run','--rm','api','npm','run','db:generate')
Invoke-Docker -Args @('compose','run','--rm','api','npm','run','db:migrate')

Write-Step "Aguardando API responder /api/v1/health"
$healthUrl = 'http://localhost:3001/api/v1/health'
$timeoutSeconds = 60
$sw = [Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt $timeoutSeconds) {
  try {
    $resp = Invoke-RestMethod -Method GET -Uri $healthUrl -TimeoutSec 3
    if ($resp.status -eq 'ok') {
      Write-Ok "API OK: $healthUrl"
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}
if ($sw.Elapsed.TotalSeconds -ge $timeoutSeconds) {
  Write-Warn "API nao respondeu health em $timeoutSeconds s."
  Write-Warn "Veja logs: docker compose logs -f api"
  exit 20
}

Write-Step "URLs"
Write-Host "API health: $healthUrl"
Write-Host "Web: http://localhost:3000"

Write-Step "Logs (CTRL+C para sair)"
Invoke-Docker -Args @('compose','logs','-f','api','web')
