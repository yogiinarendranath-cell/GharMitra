# Starts all services via cmd.exe in hidden windows. Uses Start-Process
# so closing the parent terminal does NOT kill the services.

$root = "D:\NarendraData\GharMitra"
$logDir = "$root\scripts\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Kill anything still running
& "$root\scripts\Stop-GharMitra.ps1"

# ---- API (via cmd for consistent process handling) ----
$apiCmd = "cd /d `"$root\backend`" && dotnet run --project src\GharMitra.Api\GharMitra.Api.csproj > `"$logDir\api.log`" 2>&1"
Start-Process cmd.exe -ArgumentList "/c", $apiCmd -WindowStyle Hidden

# ---- SPAs ----
$apps = @(
    @{Name="customer"; Dir="$root\frontend\customer"},
    @{Name="admin";    Dir="$root\frontend\admin"},
    @{Name="partner";  Dir="$root\frontend\partner"}
)

foreach ($app in $apps) {
    Write-Host "Starting $($app.Name)..." -ForegroundColor Cyan
    $cmd = "cd /d `"$($app.Dir)`" && npm run dev > `"$logDir\$($app.Name).log`" 2>&1"
    Start-Process cmd.exe -ArgumentList "/c", $cmd -WindowStyle Hidden
}

Write-Host "`nWaiting 40s for services to bind..." -ForegroundColor Yellow
Start-Sleep -Seconds 40

Write-Host "`nStatus:" -ForegroundColor White
"5080","5173","5174","5175" | ForEach-Object {
    $c = New-Object System.Net.Sockets.TcpClient
    try {
        $c.Connect("127.0.0.1", $_)
        Write-Host "  $_ => UP" -ForegroundColor Green
    } catch {
        Write-Host "  $_ => DOWN (see $logDir)" -ForegroundColor Red
    } finally { $c.Close() }
}

Write-Host "`nLogs: $logDir" -ForegroundColor White