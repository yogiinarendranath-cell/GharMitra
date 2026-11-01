# Reports true status of every GharMitra service. Reads ports directly.
$ports = @{ 5080 = "API"; 5173 = "Customer"; 5174 = "Admin"; 5175 = "Partner" }
$allUp = $true
foreach ($p in $ports.Keys | Sort-Object) {
    $c = New-Object System.Net.Sockets.TcpClient
    $up = $false
    try { $c.Connect("127.0.0.1", $p); $up = $true } catch { $up = $false } finally { $c.Close() }
    if ($up) { Write-Host ("  {0,-10} {1} => UP" -f $ports[$p], $p) -ForegroundColor Green }
    else     { Write-Host ("  {0,-10} {1} => DOWN" -f $ports[$p], $p) -ForegroundColor Red; $allUp = $false }
}

# Deep API check — never trust ports alone
if ((Test-Path variable:allUp) -and $ports[5080]) {
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:5080/api/services" -Method Get -ErrorAction Stop -TimeoutSec 3
        Write-Host ("  API body   => {0} categories returned" -f $r.Count) -ForegroundColor Green
    } catch {
        Write-Host "  API body   => NOT RESPONDING ($($_.Exception.Message))" -ForegroundColor Red
        $allUp = $false
    }
}

if ($allUp) { Write-Host "`nALL UP — safe to run browser demo" -ForegroundColor Green }
else        { Write-Host "`nSOME DOWN — run Start-GharMitra.ps1 (do not close the spawned windows)" -ForegroundColor Yellow }