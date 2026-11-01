# GharMitra Architecture

## System context

    +--------------------------------------+
    |        GharMitra Platform            |
    +--------------------------------------+
            |          |          |
      +-----v--+  +----v---+  +---v------+
      |Customer|  | Admin  |  | Partner  |
      |  (web) |  | (web)  |  | (web)    |
      +-----+--+  +----+---+  +---+------+
            |          |          |
            +----------+----------+
                       |  HTTPS / JWT
              +--------v--------+
              |  GharMitra API  |
              |  ASP.NET Core   |
              +--------+--------+
                       |  EF Core
              +--------v--------+
              |   SQL Server    |
              |   (LocalDB dev) |
              +-----------------+

## Containers (C4 Level 2)

| Container | Technology | Port (dev) | Responsibility |
|-----------|-----------|-----------|----------------|
| Customer SPA | React 19 + Vite | 5173 | Browse, book, view, cancel |
| Admin SPA | React 19 + Vite | 5174 | Bookings, verify, assign |
| Partner SPA | React 19 + Vite | 5175 | Assignments, accept |
| API | ASP.NET Core 10 | 5080 | Auth, catalog, bookings, admin, partner, health |
| Database | SQL Server LocalDB | - | Persistent state |

## Backend layers

    +----------------------------------+
    | GharMitra.Api                    |  HTTP, JWT, CORS, rate limit, Serilog
    |  Controllers, Program.cs, /health|
    +----------------+-----------------+
                     |
    +----------------v-----------------+
    | GharMitra.Infrastructure         |  EF Core, SqlServer, JWT, seeders
    |  DbContext, Migrations, Jwt      |
    +----------------+-----------------+
                     |
    +----------------v-----------------+
    | GharMitra.Application            |  Business logic, DTOs, interfaces
    |  AuthService, BookingService,    |
    |  ProfessionalService             |
    +----------------+-----------------+
                     |
    +----------------v-----------------+
    | GharMitra.Domain                 |  Pure entities
    |  User, Booking, Professional...  |
    +----------------------------------+

Dependency rule: arrows point inward only. Domain has zero external references.

## Key decisions

**D1 - Modular monolith over microservices.** One team, one deploy, shared transactions. Extract later when there is real scaling pressure.

**D2 - JWT + role-based authorization.** Stateless, works for 3 SPAs and future mobile apps. Roles: Customer, Professional, Admin. Claims: NameIdentifier (userId), Role.

**D3 - Verification gate in the domain layer.** BookingService.AssignAsync checks IsVerified before creating an assignment. Enforced in the service, not the controller, so background jobs and CLIs get the same guarantee.

**D4 - Audit timestamps via SaveChangesAsync override.** CreatedAtUtc on Added, UpdatedAtUtc on Modified. One place, always correct.

**D5 - IApplicationDbContext interface.** Application depends on the interface, not the concrete DbContext. Domain and Application testable without a real database.

**D6 - Cancellation is a state transition, not a delete.** Bookings in Cancelled state retain full history.

**D7 - Environment-aware rate limit.** 60/min in dev, 10/min in prod. One line of code.

## Booking state machine

    Pending --assign--> Assigned --accept--> Accepted
       |                    |                   |
       +--------------------+-------------------+--cancel--> Cancelled

Only Pending can be assigned. Only Assigned can be accepted. Completed and Cancelled are terminal.

## Database schema

    Users --+-- 1:1 -- Customers -----+-- 1:N -- Bookings --+-- 1:1 -- BookingAssignments -- 1:1 -- Professionals -- 1:1 -- Users
            +-- 1:1 -- Professionals  |                        |
                                     +-- N:1 -- Services ---- N:1 -- ServiceCategories
                                                              |
                                                              +-- 1:1 -- Reviews

- One User has one Customer profile OR one Professional profile (never both).
- Booking belongs to one customer, one service, at most one assignment.
- Review attaches to a booking after completion.

## Security model

| Concern | Approach |
|---------|----------|
| Passwords | BCrypt, cost 11 |
| Tokens | HS256, 240-min expiry, validated issuer/audience/lifetime |
| Roles | [Authorize(Roles="...")] on controllers |
| Rate limit | Fixed window on /api/auth/* |
| Secrets | User-secrets (dev) -> env vars (prod) -> Key Vault (later) |
| CORS | Explicit origins only (5173, 5174, 5175) |

## Deliberately not in v1.1

Payments, SignalR, auto-dispatch, reviews UI, mobile apps, audit log table, multi-tenancy.