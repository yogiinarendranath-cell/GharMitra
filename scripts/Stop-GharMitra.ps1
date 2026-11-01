# Kills every GharMitra process on ports 5080, 5173, 5174, 5175.
# Safe to run when nothing is up. Safe to run repeatedly.
$ports = @(5080, 5173, 5174, 5175)
$killed = 0
foreach ($p in $ports) {
    Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object {
            try { Stop-Process -Id $_ -Force -ErrorAction Stop; $killed++ } catch { }
        }
}
Write-Host "Stopped $killed process(es) across ports 5080/5173/5174/5175." -ForegroundColor Yellow
Start-Sleep -Seconds 2