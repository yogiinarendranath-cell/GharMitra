# Starts all services via cmd.exe in hidden windows. Uses Start-Process
# so closing the parent terminal does NOT kill the services.

$root = "D:\NarendraData\GharMitra"
$logDir = "$root\scripts\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Kill anything still running
& "$root\scripts\Stop-GharMitra.ps1"

Write-Host "Starting API (5080)..." -ForegroundColor Cyan
$apiCmd = "cd /d `"$root\backend`" && dotnet run --project src\GharMitra.Api\GharMitra.Api.csproj > `"$logDir\api.log`" 2>&1"
Start-Process cmd.exe -ArgumentList "/c", $apiCmd -WindowStyle Hidden

$apps = @(
    @{Name="customer"; Dir="$root\frontend\customer"; Port=5173},
    @{Name="admin";    Dir="$root\frontend\admin";    Port=5174},
    @{Name="partner";  Dir="$root\frontend\partner";  Port=5175}
)

foreach ($app in $apps) {
    Write-Host "Starting $($app.Name) ($($app.Port))..." -ForegroundColor Cyan
    $cmd = "cd /d `"$($app.Dir)`" && npm run dev > `"$logDir\$($app.Name).log`" 2>&1"
    Start-Process cmd.exe -ArgumentList "/c", $cmd -WindowStyle Hidden
}

Write-Host "`nWaiting up to 60s for services to respond..." -ForegroundColor Yellow
$deadline = (Get-Date).AddSeconds(60)
$checks = @(
    @{Name="API";      Url="http://localhost:5080/api/services"},
    @{Name="Customer"; Url="http://localhost:5173/"},
    @{Name="Admin";    Url="http://localhost:5174/"},
    @{Name="Partner";  Url="http://localhost:5175/"}
)

$results = @{}
while ((Get-Date) -lt $deadline) {
    $allOk = $true
    foreach ($c in $checks) {
        if (-not $results[$c.Name]) {
            try {
                Invoke-WebRequest -Uri $c.Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null
                $results[$c.Name] = $true
            } catch {
                $results[$c.Name] = $false
                $allOk = $false
            }
        }
    }
    if ($allOk) { break }
    Start-Sleep -Milliseconds 1500
}

Write-Host "`n=== GharMitra status (HTTP) ===" -ForegroundColor White
foreach ($c in $checks) {
    if ($results[$c.Name]) {
        Write-Host ("  {0,-10} {1} => UP" -f $c.Name, $c.Url) -ForegroundColor Green
    } else {
        Write-Host ("  {0,-10} {1} => DOWN (see $logDir)" -f $c.Name, $c.Url) -ForegroundColor Red
    }
}

Write-Host "`nLogs: $logDir" -ForegroundColor White