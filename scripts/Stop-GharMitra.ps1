# Kills services by port AND by background job.
"gharmitra-api","gharmitra-customer","gharmitra-admin","gharmitra-partner" |
    ForEach-Object { Get-Job -Name $_ -ErrorAction SilentlyContinue | Stop-Job -ErrorAction SilentlyContinue | Remove-Job -Force -ErrorAction SilentlyContinue }

@(5080, 5173, 5174, 5175) | ForEach-Object {
    Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}
Write-Host "Stopped." -ForegroundColor Yellow