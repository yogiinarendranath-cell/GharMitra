# GharMitra — Your Home. Our Care.

A three-sided home-services marketplace for Indian households. Customers book verified home professionals; admins verify professionals and assign bookings; partners accept assignments — all with a clean, secure, production-shaped backend.

**Status:** v1.1 shipped — full end-to-end flow working.

## What works

| Role | Capability |
|------|------------|
| Customer | Register, login, browse services, book, view my bookings, cancel |
| Admin | Login, view all bookings, verify professionals, assign bookings |
| Professional | Login, view assignments, accept assignments |

Verified flow: verify -> assign -> accept -> cancel. All 7 API endpoints tested.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | ASP.NET Core 10 Web API, EF Core 10, SQL Server (LocalDB dev) |
| Frontend | React 19, TypeScript, Vite 5 |
| Auth | JWT + role-based authorization |
| Logging | Serilog (console + rolling file) |
| Reliability | Rate limiting (60/min dev, 10/min prod), audit interceptor |
| Observability | /health endpoint |

Architecture: see docs/architecture.md. Operations: see docs/operations.md.

## Run locally (Windows)

Prerequisites:
- .NET SDK 10 (dotnet --version shows 10.x)
- Node.js 20+ (node --version shows 20.x or higher)
- SQL Server LocalDB (sqllocaldb info lists MSSQLLocalDB)

First-time setup:

    cd D:\NarendraData\GharMitra
    cd backend
    dotnet restore
    dotnet ef database update --project src/GharMitra.Infrastructure/GharMitra.Infrastructure.csproj --startup-project src/GharMitra.Api/GharMitra.Api.csproj
    cd ..
    cd frontend\customer; npm install; cd ..\..
    cd frontend\admin; npm install; cd ..\..
    cd frontend\partner; npm install; cd ..

Start everything (from D:\NarendraData\GharMitra):

    powershell -ExecutionPolicy Bypass -File .\scripts\Start-GharMitra.ps1

Expected:

    === GharMitra status (HTTP) ===
      API        http://localhost:5080/api/services => UP
      Customer   http://localhost:5173/ => UP
      Admin      http://localhost:5174/ => UP
      Partner    http://localhost:5175/ => UP

Open in browser:

| Service | URL | Login |
|---------|-----|-------|
| Customer | http://localhost:5173 | admin@gharmitra.local / Admin@1234 (admin) |
| Admin | http://localhost:5174 | admin@gharmitra.local / Admin@1234 |
| Partner | http://localhost:5175 | sweta@gharmitra.local / Test@1234 |
| API health | http://localhost:5080/health | (public) |

Stop everything:

    powershell -ExecutionPolicy Bypass -File .\scripts\Stop-GharMitra.ps1

## End-to-end demo (5 minutes)

1. Customer (5173) — login, book any service -> status Pending
2. Admin (5174) — Professionals tab, verify a professional; Bookings tab, assign pending booking
3. Partner (5175) — login as that professional, accept the assignment
4. Customer (5173) — refresh, see Accepted + assigned name
5. Customer — cancel, see Cancelled

Full verification checklist: docs/operations.md.

## Project structure

    GharMitra/
    ├── backend/                    ASP.NET Core solution
    │   ├── src/
    │   │   ├── GharMitra.Domain/          Entities, no dependencies
    │   │   ├── GharMitra.Application/     Use cases, DTOs
    │   │   ├── GharMitra.Infrastructure/  EF Core, JWT, persistence
    │   │   └── GharMitra.Api/             Controllers, /health
    │   └── Dockerfile
    ├── frontend/
    │   ├── customer/              React SPA (5173)
    │   ├── admin/                 React SPA (5174)
    │   └── partner/               React SPA (5175)
    ├── scripts/                   Start/Stop PowerShell helpers
    ├── docs/                      architecture.md, operations.md
    ├── docker-compose.yml         (Phase 10E: needs Docker Desktop)
    └── .github/workflows/ci.yml   GitHub Actions

## Development principles

1. Clean architecture — dependencies flow inward only.
2. Gates before trust — unverified professionals cannot be assigned bookings.
3. Audit at save time — timestamps set by SaveChangesAsync override.
4. Fail loudly — every service validates inputs, returns 400 on invalid.
5. Health is proven — /health runs a real DB query.

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1.0 | Walking skeleton | Shipped |
| 1.1 | Verification, partner app, cancellation, Serilog, rate limit | Shipped |
| 10C | /health, 0 warnings, start scripts | Shipped |
| 10D | CI, README, architecture, operations | Shipped |
| 10E | Docker Compose verified (needs Docker Desktop) | Pending |
| 1.2 | Payments, SignalR live status, invoices | Planned |
| 1.3 | Dispatch automation, GPS tracking | Planned |
| 1.4 | Reviews, background verification | Planned |

## Trademark

GharMitra is a working brand. Check domain availability and trademark clearance in India (NICE classes 37, 45) before public launch.
<!-- Vercel trigger -->
