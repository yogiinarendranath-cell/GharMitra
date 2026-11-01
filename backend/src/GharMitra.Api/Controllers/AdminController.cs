using GharMitra.Application.Bookings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IBookingService _bookings;
    public AdminController(IBookingService bookings) => _bookings = bookings;

    [HttpGet("bookings")]
    public async Task<ActionResult<List<BookingDto>>> Bookings(CancellationToken ct)
        => Ok(await _bookings.GetAllAsync(ct));

    [HttpGet("professionals")]
    public async Task<ActionResult<List<AdminProfessionalDto>>> Professionals(CancellationToken ct)
        => Ok(await _bookings.GetProfessionalsAsync(ct));

    [HttpPost("bookings/{id:guid}/assign")]
    public async Task<IActionResult> Assign(Guid id, AssignBookingRequest request, CancellationToken ct)
    {
        try
        {
            await _bookings.AssignAsync(id, request.ProfessionalId, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}