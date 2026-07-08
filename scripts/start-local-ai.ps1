# ─────────────────────────────────────────────────────────────
# ClipOps — Enciende la IA local (Ollama + whisper.cpp) en ESTA PC.
#
# El análisis de clips corre 100% en tu máquina (GPU propia); la web en el
# VPS solo orquesta. Este script:
#   1. Configura OLLAMA_ORIGINS para que el navegador (desde el dominio de
#      producción) pueda hablar con Ollama, y lo arranca.
#   2. Descarga el modelo de visión si falta.
#   3. Arranca whisper-server (transcripción) con el modelo ggml.
#
# Instalación previa (una sola vez):
#   - Ollama: https://ollama.com/download
#   - whisper.cpp: binarios oficiales v1.9.1 ya descargados en $WhisperExe
#     (repo clonado en C:\Users\<tu>\tools\whisper.cpp por si quieres compilar)
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\start-local-ai.ps1
# ─────────────────────────────────────────────────────────────
param(
  [string]$WhisperExe   = "$env:USERPROFILE\tools\whisper-release\Release\whisper-server.exe",
  [string]$WhisperModel = "$env:USERPROFILE\tools\whisper-models\ggml-small.bin",
  [int]   $WhisperPort  = 8080,
  [string]$Origins      = "https://clipops.duckdns.org,http://localhost:3000",
  [string]$VisionModel  = "qwen3.5:4b"
)

$ErrorActionPreference = "Stop"

function Test-Port([int]$Port) {
  try {
    $c = New-Object Net.Sockets.TcpClient
    $c.Connect("127.0.0.1", $Port); $c.Close(); return $true
  } catch { return $false }
}

# ── 1. Ollama con CORS hacia la app ──
Write-Host "[1/3] Ollama..." -ForegroundColor Cyan
# Persistimos OLLAMA_ORIGINS a nivel usuario para futuros arranques del
# servicio/app de Ollama, y también en esta sesión para el serve de abajo.
[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", $Origins, "User")
$env:OLLAMA_ORIGINS = $Origins

if (Test-Port 11434) {
  Write-Host "  Ollama ya corre en :11434." -ForegroundColor Yellow
  Write-Host "  OJO: si lo arrancaste ANTES de este script, no tiene OLLAMA_ORIGINS." -ForegroundColor Yellow
  Write-Host "  Si el navegador da error de CORS: cierra Ollama (icono de la bandeja) y vuelve a correr esto."
} else {
  Start-Process -WindowStyle Minimized powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$env:OLLAMA_ORIGINS='$Origins'; ollama serve"
  )
  Write-Host "  Arrancando ollama serve (ventana minimizada)..."
  $tries = 0
  while (-not (Test-Port 11434) -and $tries -lt 30) { Start-Sleep 1; $tries++ }
  if (-not (Test-Port 11434)) { throw "Ollama no levantó en :11434. ¿Está instalado? https://ollama.com/download" }
  Write-Host "  Ollama listo." -ForegroundColor Green
}

# ── 2. Modelo de visión ──
Write-Host "[2/3] Modelo $VisionModel..." -ForegroundColor Cyan
$have = (& ollama list) -match [regex]::Escape($VisionModel)
if ($have) {
  Write-Host "  Ya está descargado." -ForegroundColor Green
} else {
  Write-Host "  Descargando (esto puede tardar varios GB)..."
  & ollama pull $VisionModel
}

# ── 3. whisper-server ──
Write-Host "[3/3] whisper-server..." -ForegroundColor Cyan
if (Test-Port $WhisperPort) {
  Write-Host "  Ya hay algo en :$WhisperPort (asumimos que es whisper)." -ForegroundColor Green
} else {
  if (-not (Test-Path $WhisperExe))   { throw "No encuentro $WhisperExe" }
  if (-not (Test-Path $WhisperModel)) { throw "No encuentro el modelo $WhisperModel" }
  Start-Process -WindowStyle Minimized -FilePath $WhisperExe -ArgumentList @(
    "-m", $WhisperModel, "--host", "127.0.0.1", "--port", "$WhisperPort"
  )
  $tries = 0
  while (-not (Test-Port $WhisperPort) -and $tries -lt 20) { Start-Sleep 1; $tries++ }
  if (-not (Test-Port $WhisperPort)) { throw "whisper-server no levantó en :$WhisperPort." }
  Write-Host "  whisper-server listo." -ForegroundColor Green
}

Write-Host ""
Write-Host "IA local encendida ✓  Abre un clip en la web y pulsa 'Analizar clip'." -ForegroundColor Green
Write-Host "  Ollama:  http://localhost:11434  ($VisionModel)"
Write-Host "  Whisper: http://localhost:$WhisperPort"
