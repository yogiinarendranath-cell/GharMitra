# Security Policy

## Reporting a vulnerability

Do NOT open a public GitHub issue for security vulnerabilities.

Email the maintainer directly with:
1. Description of the issue
2. Steps to reproduce
3. Affected commit
4. Impact assessment

We will acknowledge within 48 hours and coordinate disclosure.

## Supported versions

| Version | Supported |
|---------|-----------|
| v1.1.x  | Yes |
| < v1.0  | No |

## Dependency advisories

Tracked in CI (.github/workflows/ci.yml runs dotnet list package --vulnerable --include-transitive). Any new advisory triggers a warning annotation.

Current state (as of 10C): 0 NuGet advisories.

## Production hardening checklist

- Move Jwt:Key and connection strings to Azure Key Vault
- Enable HTTPS-only + HSTS
- Set RequireHttpsMetadata = true on JWT bearer
- Add Content-Security-Policy header to nginx configs
- Enable SQL Server encryption at rest
- Rate limit all endpoints (currently only /api/auth/*)
- Add WAF (Cloudflare or Azure Front Door) in front of API
- Enable Application Insights, alert on 5xx rate > 1%
- Run dotnet list package --vulnerable before every release
- Penetration test on auth + booking endpoints
- Legal: privacy policy, T&C, refund policy