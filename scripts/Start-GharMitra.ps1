# One-shot startup for the full GharMitra stack.
# Opens 4 dedicated PowerShell windows (one per service), then polls ports.
$root = "D:\NarendraData\GharMitra"

function Test-PortFast($port) {
    $c = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $c.BeginConnect("127.0.0.1", $port, $null, $null)
        if (-not $iar.AsyncWaitHandle.WaitOne(300)) { return $false }
        $c.EndConnect($iar); return $true
    } catch { return $false } finally { $c.Close() }
}

# Always start clean
& "$root\scripts\Stop-GharMitra.ps1"

Write-Host "Starting API (5080)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; dotnet run --project src/GharMitra.Api/GharMitra.Api.csproj"

Write-Host "Starting Customer (5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend\customer'; npm run dev"

Write-Host "Starting Admin (5174)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend\admin'; npm run dev"

Write-Host "Starting Partner (5175)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend\partner'; npm run dev"

Write-Host "`nWaiting up to 90s for all ports..." -ForegroundColor Yellow
$ports = @(5080, 5173, 5174, 5175)
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    $allUp = $true
    foreach ($p in $ports) { if (-not (Test-PortFast $p)) { $allUp = $false; break } }
    if ($allUp) { break }
    Start-Sleep -Milliseconds 800
}

Write-Host "`n=== GharMitra status ===" -ForegroundColor White
foreach ($p in $ports) {
    if (Test-PortFast $p) { Write-Host ("  {0} => UP" -f $p) -ForegroundColor Green }
    else                   { Write-Host ("  {0} => DOWN (check its window)" -f $p) -ForegroundColor Red }
}
Write-Host "`nOpen:" -ForegroundColor White
Write-Host "  Customer  http://localhost:5173" -ForegroundColor White
Write-Host "  Admin     http://localhost:5174" -ForegroundColor White
Write-Host "  Partner   http://localhost:5175" -ForegroundColor White
Write-Host "  API       http://localhost:5080/api/services" -ForegroundColor White