# GharMitra Operations Runbook

## First rule

Always start every PowerShell session with:

    Set-Location D:\NarendraData\GharMitra

Every command in this document assumes you are in that directory.

## Start the platform

    powershell -ExecutionPolicy Bypass -File .\scripts\Start-GharMitra.ps1

Opens 4 hidden processes (API + 3 SPAs), waits up to 60s, prints HTTP-based status. Safe to run when already running — it stops everything first.

Success looks like:

    === GharMitra status (HTTP) ===
      API        http://localhost:5080/api/services => UP
      Customer   http://localhost:5173/ => UP
      Admin      http://localhost:5174/ => UP
      Partner    http://localhost:5175/ => UP

## Stop the platform

    powershell -ExecutionPolicy Bypass -File .\scripts\Stop-GharMitra.ps1

Kills any process on ports 5080, 5173, 5174, 5175. Idempotent.

## Check status without starting

    "5080","5173","5174","5175" | ForEach-Object {
        $c = New-Object System.Net.Sockets.TcpClient
        try {
            $c.Connect("localhost", $_)
            "{0} => UP" -f $_
        } catch {
            "{0} => DOWN" -f $_
        } finally { $c.Close() }
    }

## View logs

    Get-Content .\scripts\logs\api.log -Tail 50 -Wait
    Get-Content .\scripts\logs\customer.log -Tail 20
    Get-Content .\scripts\logs\admin.log -Tail 20
    Get-Content .\scripts\logs\partner.log -Tail 20

## Health check

    Invoke-RestMethod -Uri "http://localhost:5080/health" -Method Get

- 200 healthy — API up, DB reachable
- 503 degraded — API up, DB unreachable
- Connection refused — API not running

## Database

### DESTRUCTIVE: Reset database (destroys all data)

Only run this when you deliberately want to start from zero.

    Set-Location D:\NarendraData\GharMitra\backend
    dotnet ef database update 0 --project src/GharMitra.Infrastructure/GharMitra.Infrastructure.csproj --startup-project src/GharMitra.Api/GharMitra.Api.csproj
    dotnet ef database update --project src/GharMitra.Infrastructure/GharMitra.Infrastructure.csproj --startup-project src/GharMitra.Api/GharMitra.Api.csproj

Next API startup re-seeds via DbSeeder.

### Add a migration

    Set-Location D:\NarendraData\GharMitra\backend
    dotnet ef migrations add YourMigrationName --project src/GharMitra.Infrastructure/GharMitra.Infrastructure.csproj --startup-project src/GharMitra.Api/GharMitra.Api.csproj --output-dir Persistence/Migrations
    dotnet ef database update --project src/GharMitra.Infrastructure/GharMitra.Infrastructure.csproj --startup-project src/GharMitra.Api/GharMitra.Api.csproj

### Connect with SSMS

- Server: (localdb)\MSSQLLocalDB
- Database: GharMitraDb
- Auth: Windows Authentication

## Verification checklist

Run after every significant change:

| # | Action | Expected |
|---|--------|----------|
| 1 | Open http://localhost:5080/api/services | 4 categories, 6 services |
| 2 | Customer (5173) — register and login | Welcome screen |
| 3 | Book any service | Status = Pending |
| 4 | Admin (5174) — verify a professional | Row shows verified |
| 5 | Admin — assign the pending booking | Status = Assigned, professional named |
| 6 | Partner (5175) — login and accept | Status = Accepted |
| 7 | Customer — refresh | Accepted + assigned name + Cancel button |
| 8 | Customer — cancel | Status = Cancelled |

All 8 green = platform healthy.

## Common failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Unable to connect to remote server | API not running | Start-GharMitra.ps1 |
| Address already in use on dotnet run | Previous API still alive | Stop-GharMitra.ps1 |
| Cannot find path ..scripts.. | Wrong working directory | Set-Location D:\NarendraData\GharMitra |
| && is not a valid statement separator | PowerShell 5.1 does not support && | Use ; or separate lines |
| DATABASE connection failed at startup | LocalDB not running | sqllocaldb start MSSQLLocalDB |
| SPAs show Failed to fetch | API down | Start API first |

## PowerShell 5.1 gotchas

Windows PowerShell 5.1 does NOT support && as a command separator. Use ; instead:

    # Wrong:
    cd backend && dotnet build

    # Right:
    Set-Location backend; dotnet build

## Secrets management

### Dev

    Set-Location D:\NarendraData\GharMitra\backend\src\GharMitra.Api
    dotnet user-secrets set "Jwt:Key" "<64-char-random>"
    dotnet user-secrets list

Stored at %APPDATA%\Microsoft\UserSecrets\<id>\secrets.json. Never committed.

## CI

.github/workflows/ci.yml runs on every push:
- Backend: dotnet build Release
- Frontend: npm ci then npm run build for customer, admin, partner

To simulate locally (from D:\NarendraData\GharMitra):

    Set-Location backend; dotnet build GharMitra.slnx -c Release; Set-Location ..
    Set-Location frontend\customer; npm run build; Set-Location ..\..
    Set-Location frontend\admin; npm run build; Set-Location ..\..
    Set-Location frontend\partner; npm run build; Set-Location ..\..