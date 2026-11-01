# Launches all 4 services as background jobs. Logs to scripts/logs/.
# Windows persist. Must run: Stop-GharMitra.ps1 to end them.

$root = "D:\NarendraData\GharMitra"
$logDir = "$root\scripts\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Kill any leftovers
& "$root\scripts\Stop-GharMitra.ps1"

Write-Host "Starting API..." -ForegroundColor Cyan
$apiJob = Start-Job -Name gharmitra-api -ScriptBlock {
    param($dir, $log)
    Set-Location $dir
    & dotnet run --project src/GharMitra.Api/GharMitra.Api.csproj *>&1 |
        Out-File -FilePath $log -Encoding UTF8
} -ArgumentList "$root\backend", "$logDir\api.log"

Write-Host "Starting Customer..." -ForegroundColor Cyan
Start-Job -Name gharmitra-customer -ScriptBlock {
    param($dir, $log)
    Set-Location $dir
    & npm run dev *>&1 | Out-File -FilePath $log -Encoding UTF8
} -ArgumentList "$root\frontend\customer", "$logDir\customer.log" | Out-Null

Write-Host "Starting Admin..." -ForegroundColor Cyan
Start-Job -Name gharmitra-admin -ScriptBlock {
    param($dir, $log)
    Set-Location $dir
    & npm run dev *>&1 | Out-File -FilePath $log -Encoding UTF8
} -ArgumentList "$root\frontend\admin", "$logDir\admin.log" | Out-Null

Write-Host "Starting Partner..." -ForegroundColor Cyan
Start-Job -Name gharmitra-partner -ScriptBlock {
    param($dir, $log)
    Set-Location $dir
    & npm run dev *>&1 | Out-File -FilePath $log -Encoding UTF8
} -ArgumentList "$root\frontend\partner", "$logDir\partner.log" | Out-Null

Write-Host "`nWaiting 30s for services to bind..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`nStatus:" -ForegroundColor White
"5080","5173","5174","5175" | ForEach-Object {
    $c = New-Object System.Net.Sockets.TcpClient
    try { $c.Connect("127.0.0.1", $_); Write-Host "  $_ => UP" -ForegroundColor Green }
    catch { Write-Host "  $_ => DOWN (see $logDir)" -ForegroundColor Red }
    finally { $c.Close() }
}