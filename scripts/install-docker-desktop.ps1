#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step([string]$msg) { Write-Host "\n==> $msg" -ForegroundColor Cyan }
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

Write-Step "Checando Winget"
$winget = Get-Command winget -ErrorAction SilentlyContinue
if (-not $winget) {
  Write-Warn "winget não encontrado. Instale o 'App Installer' pela Microsoft Store e reabra o terminal."
  exit 2
}

Write-Step "Checando WSL"
$wsl = Get-Command wsl -ErrorAction SilentlyContinue
if (-not $wsl) {
  Write-Warn "wsl não encontrado. Instale/ative o WSL (Windows Features)."
  exit 3
}

Write-Step "Habilitando WSL2 (se necessário)"
try {
  wsl --status | Out-Null
} catch {
  Write-Warn "WSL parece não estar inicializado. Tentando instalar WSL (pode exigir reboot)."
  wsl --install | Out-Null
  Write-Warn "WSL iniciado. Reinicie o Windows e rode este script novamente."
  exit 10
}

Write-Step "Instalando Docker Desktop via winget"
winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements

if (Test-PendingReboot) {
  Write-Warn "Reboot pendente detectado (WSL/VirtualMachinePlatform). Reinicie o Windows antes de continuar."
}

Write-Step "Finalizando"
Write-Warn "Abra o Docker Desktop pelo Menu Iniciar e conclua a configuração (WSL2 recomendado)."
Write-Warn "Se o Docker pedir reboot, reinicie o Windows."
Write-Host "\nDepois rode: .\\scripts\\dev-up.ps1" -ForegroundColor Green
