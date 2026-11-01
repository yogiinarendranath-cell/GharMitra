using GharMitra.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("health")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    private readonly IApplicationDbContext _db;
    public HealthController(IApplicationDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var dbOk = false;
        try
        {
            dbOk = await _db.Users.AnyAsync(ct);
        }
        catch { /* db unreachable */ }

        var status = dbOk ? "healthy" : "degraded";
        return dbOk
            ? Ok(new { status, timestamp = DateTime.UtcNow, db = "ok" })
            : StatusCode(503, new { status, timestamp = DateTime.UtcNow, db = "unreachable" });
    }
}