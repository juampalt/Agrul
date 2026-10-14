# Sync tickets to GitHub Issues via gh CLI
# Usage: ./scripts/sync-github-issues.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Sincronizador de Tickets de Agrul a GitHub Issues ===" -ForegroundColor Cyan

# 1. Verificar gh CLI y autenticacion
try {
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "No se detecto sesion activa de GitHub en gh CLI."
        Write-Host "Por favor ejecuta: gh auth login" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Error "El comando 'gh' no esta disponible o no esta en el PATH."
    exit 1
}

$repo = "juampalt/Agrul"
Write-Host "Repositorio destino: $repo" -ForegroundColor Green

# 2. Cargar tickets desde JSON
$ticketsJson = Get-Content -Raw -Path "scripts/tickets-data.json" | ConvertFrom-Json

# 3. Iterar y crear issues que no existan
Write-Host "Obteniendo issues existentes en el repositorio..." -ForegroundColor Cyan
$existingIssues = gh issue list --repo $repo --limit 200 --json title --jq '.[].title'

foreach ($t in $ticketsJson) {
    $expectedTitle = "$($t.id): $($t.title)"
    
    if ($existingIssues -contains $expectedTitle) {
        Write-Host "[SKIP] Ya existe issue: $expectedTitle" -ForegroundColor DarkGray
        continue
    }

    $body = @"
## $($t.id) — $($t.title)

**Épica:** $($t.epic)  
**Módulo:** $($t.module)  
**Prioridad:** $($t.priority)  
$(if ($t.rf.Count -gt 0) { "**Requisitos:** " + ($t.rf -join ", ") + "  " } else { "" })
$(if ($t.rn.Count -gt 0) { "**Reglas de Negocio:** " + ($t.rn -join ", ") + "  " } else { "" })

### Descripción
$($t.description)

### Tareas Técnicas
$($t.tasks | ForEach-Object { "- $_" } | Out-String)

### Criterios de Aceptación
$($t.acceptanceCriteria | ForEach-Object { "- [ ] $_" } | Out-String)

---
*Ticket generado automáticamente por Antigravity para Agrul.*
"@

    Write-Host "Creando issue: $expectedTitle..." -ForegroundColor Yellow
    
    # Preparar labels
    $labelArgs = @()
    foreach ($l in $t.labels) {
        $labelArgs += "--label"
        $labelArgs += $l
    }

    gh issue create --repo $repo --title $expectedTitle --body $body @labelArgs
    Start-Sleep -Milliseconds 800
}

Write-Host "=== Sincronización completada con éxito ===" -ForegroundColor Green
