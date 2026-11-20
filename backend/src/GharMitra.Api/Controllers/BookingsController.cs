using System.Security.Claims;
using GharMitra.Application.Bookings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize(Roles = "Customer")]
public class BookingsController : ControllerBase
{
    [HttpPost("{id:guid}/cancel")]
public async Task<ActionResult<BookingDto>> Cancel(Guid id, CancelBookingRequest request, CancellationToken ct)
{
    try { return Ok(await _bookings.CancelAsync(CurrentUserId, id, request.Reason, ct)); }
    catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
}
    private readonly IBookingService _bookings;
    public BookingsController(IBookingService bookings) => _bookings = bookings;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<ActionResult<BookingDto>> Create(CreateBookingRequest request, CancellationToken ct)
    {
        try { return Ok(await _bookings.CreateAsync(CurrentUserId, request, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("my")]
    public async Task<ActionResult<List<BookingDto>>> My(CancellationToken ct)
        => Ok(await _bookings.GetMyAsync(CurrentUserId, ct));

        [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("coupon-attempts")]
[HttpPost("{id:guid}/apply-coupon")]
public async Task<ActionResult<CouponApplyResponse>> ApplyCoupon(

    
    [HttpPost("{id:guid}/refund")]
    public async Task<ActionResult<RefundResultDto>> Refund(
        Guid id,
        [FromBody] RefundRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _bookings.RefundAsync(CurrentUserId, id, request.Reason, ct);
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new RefundResultDto(false, 0, "error", ex.Message));
        }
    }

    public record RefundRequest(string Reason);
}