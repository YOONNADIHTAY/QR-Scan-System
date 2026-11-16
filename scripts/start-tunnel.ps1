# Stable public tunnel for phone QR scans (Cloudflare quick tunnel).
# Keep this window open while testing. It auto-writes PUBLIC_URL to backend/.env
# and restarts the backend so QR links stay in sync.

$ErrorActionPreference = 'Stop'
$port = 5000
$root = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $root 'backend\.env'
$backendDir = Join-Path $root 'backend'

function Find-Cloudflared {
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe",
    "$env:ProgramFiles\cloudflared\cloudflared.exe",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_*\cloudflared.exe",
    "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"
  )
  foreach ($pattern in $candidates) {
    $hit = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit) { return $hit.FullName }
  }
  return $null
}

function Set-PublicUrl([string]$url) {
  $url = $url.TrimEnd('/')
  if (-not (Test-Path $envPath)) {
    Set-Content -Path $envPath -Value "PUBLIC_URL=$url`n" -Encoding utf8
  } else {
    $raw = Get-Content $envPath -Raw
    if ($raw -match '(?m)^PUBLIC_URL=.*$') {
      $raw = [regex]::Replace($raw, '(?m)^PUBLIC_URL=.*$', "PUBLIC_URL=$url")
    } else {
      $raw = $raw.TrimEnd() + "`nPUBLIC_URL=$url`n"
    }
    Set-Content -Path $envPath -Value $raw -NoNewline -Encoding utf8
  }
  Write-Host "PUBLIC_URL => $url"
}

function Restart-Backend {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
  Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $backendDir -WindowStyle Hidden
  Write-Host "Backend restarted on port $port"
}

$cloudflared = Find-Cloudflared
if (-not $cloudflared) {
  Write-Host "cloudflared not found. Install with:"
  Write-Host "  winget install --id Cloudflare.cloudflared -e"
  Write-Host ""
  Write-Host "Falling back to localhost.run (less stable)..."
  ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -R 80:127.0.0.1:$port nokey@localhost.run
  exit
}

Write-Host "Starting Cloudflare tunnel -> http://127.0.0.1:$port"
Write-Host "Keep this window open. URL will be saved to backend/.env automatically."
Write-Host ""

# Kill old localhost.run tunnels so they don't fight for attention
Get-Process ssh -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $cloudflared
$psi.Arguments = "tunnel --url http://127.0.0.1:$port --no-autoupdate"
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
[void]$proc.Start()

$seen = $null
$reader = {
  param($stream, $label)
  while ($null -ne ($line = $stream.ReadLine())) {
    Write-Host $line
    if ($line -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
      $url = [regex]::Match($line, 'https://[a-z0-9-]+\.trycloudflare\.com').Value
      if ($url -and $url -ne $script:seen) {
        $script:seen = $url
        Set-PublicUrl $url
        Restart-Backend
        Write-Host ""
        Write-Host "Scan base ready: $url"
        Write-Host "Re-Save QR codes so they use this URL."
        Write-Host ""
      }
    }
  }
}

$outJob = Start-Job -ScriptBlock $reader -ArgumentList $proc.StandardOutput, 'out'
$errJob = Start-Job -ScriptBlock $reader -ArgumentList $proc.StandardError, 'err'

try {
  while (-not $proc.HasExited) {
    Receive-Job $outJob, $errJob | ForEach-Object { $_ }
    Start-Sleep -Milliseconds 400
  }
  Receive-Job $outJob, $errJob | ForEach-Object { $_ }
} finally {
  Stop-Job $outJob, $errJob -ErrorAction SilentlyContinue
  Remove-Job $outJob, $errJob -ErrorAction SilentlyContinue
  if (-not $proc.HasExited) { $proc.Kill() }
}
