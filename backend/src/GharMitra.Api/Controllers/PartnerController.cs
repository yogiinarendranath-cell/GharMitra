using System.Security.Claims;
using GharMitra.Application.Professionals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/partner")]
[Authorize(Roles = "Professional")]
public class PartnerController : ControllerBase
{
    private readonly IProfessionalService _pros;
    public PartnerController(IProfessionalService pros) => _pros = pros;

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
}