using GharMitra.Application.Bookings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/admin/bookings")]
[Authorize(Roles = "Admin")]
public class AdminBookingsController : ControllerBase
{
    private readonly IBookingService _bookings;
    public AdminBookingsController(IBookingService bookings) => _bookings = bookings;

    /// <summary>
    /// Admin-initiated refund. Refunds any paid booking by ID regardless of owner.
    /// Uses Guid.Empty as the "acting user" — RefundAsync must handle admin-initiated
    /// refunds without owner check when the caller is not the booking owner.
    /// </summary>
    [HttpPost("{id:guid}/refund")]
    public async Task<ActionResult<RefundResultDto>> Refund(
        Guid id,
        [FromBody] RefundRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _bookings.AdminRefundAsync(id, request.Reason, ct);
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new RefundResultDto(false, 0, "error", ex.Message));
        }
    }
}

public record AdminRefundRequest(string Reason);