using System.Security.Claims;
using GharMitra.Application.Common.Interfaces;
using GharMitra.Application.Professionals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/partner")]
[Authorize(Roles = "Professional")]
public class PartnerController : ControllerBase
{
    private readonly IProfessionalService _pros;
    private readonly IProfessionalVerificationService _verification;
    private readonly IApplicationDbContext _db;

    public PartnerController(IProfessionalService pros, IProfessionalVerificationService verification, IApplicationDbContext db)
    {
        _pros = pros;
        _verification = verification;
        _db = db;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("me")]
    public async Task<ActionResult<ProfessionalProfileDto>> Me(CancellationToken ct)
    {
        try { return Ok(await _pros.GetMyProfileAsync(CurrentUserId, ct)); }
        catch (InvalidOperationException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("assignments")]
    public async Task<ActionResult<List<AssignmentDto>>> Assignments(CancellationToken ct)
        => Ok(await _pros.GetMyAssignmentsAsync(CurrentUserId, ct));

    [HttpPost("assignments/{id:guid}/accept")]
    public async Task<ActionResult<AssignmentDto>> Accept(Guid id, CancellationToken ct)
    {
        try { return Ok(await _pros.AcceptAsync(CurrentUserId, id, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("assignments/{id:guid}/start")]
    public async Task<ActionResult<AssignmentDto>> Start(Guid id, CancellationToken ct)
    {
        try { return Ok(await _pros.StartJobAsync(CurrentUserId, id, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("assignments/{id:guid}/complete")]
    public async Task<ActionResult<AssignmentDto>> Complete(Guid id, CancellationToken ct)
    {
        try { return Ok(await _pros.CompleteJobAsync(CurrentUserId, id, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("earnings")]
    public async Task<ActionResult<EarningsDto>> Earnings(CancellationToken ct)
    {
        try { return Ok(await _pros.GetEarningsAsync(CurrentUserId, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("availability")]
    public async Task<IActionResult> ToggleAvailability([FromBody] AvailabilityRequest request, CancellationToken ct)
    {
        try
        {
            await _pros.ToggleAvailabilityAsync(CurrentUserId, request.IsAvailable, ct);
            return Ok(new { message = "Availability updated." });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    public record LocationUpdateRequest(double Latitude, double Longitude);

    [HttpPost("location")]
    public async Task<IActionResult> UpdateLocation(LocationUpdateRequest request, CancellationToken ct)
    {
        var pro = await _db.Professionals.FirstOrDefaultAsync(p => p.UserId == CurrentUserId, ct);
        if (pro == null) return NotFound();

        pro.Latitude = request.Latitude;
        pro.Longitude = request.Longitude;
        pro.LastLocationUpdateUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Location updated" });
    }
    // ─── VERIFICATION ENDPOINTS ───
    
    [HttpPost("verification/upload")]
    public async Task<ActionResult<VerificationStatusDto>> UploadVerification(
        [FromBody] SubmitVerificationRequest request, CancellationToken ct)
    {
        try { return Ok(await _verification.SubmitAsync(CurrentUserId, request, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("verification/status")]
    public async Task<ActionResult<VerificationStatusDto>> VerificationStatus(CancellationToken ct)
    {
        try { return Ok(await _verification.GetStatusAsync(CurrentUserId, ct)); }
        catch (InvalidOperationException ex) { return NotFound(new { message = ex.Message }); }
    }
}