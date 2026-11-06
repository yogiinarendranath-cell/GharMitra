using GharMitra.Application.Bookings;
using GharMitra.Application.Professionals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IBookingService _bookings;
    private readonly IProfessionalService _pros;

    public AdminController(IBookingService bookings, IProfessionalService pros)
    {
        _bookings = bookings;
        _pros = pros;
    }

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

    [HttpPost("professionals/{id:guid}/verify")]
    public async Task<IActionResult> VerifyProfessional(Guid id, [FromBody] VerifyProfessionalRequest request, CancellationToken ct)
    {
        try
        {
            await _pros.VerifyAsync(id, request.Notes, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<GharMitra.Application.Analytics.AnalyticsDto>> Analytics(
        [FromServices] GharMitra.Application.Analytics.IAnalyticsService analytics,
        CancellationToken ct)
    {
        return Ok(await analytics.GetAnalyticsAsync(ct));
    }

    // ----- COUPON MANAGEMENT -----

    [HttpGet("coupons")]
    public async Task<ActionResult<List<GharMitra.Application.Coupons.CouponDto>>> GetCoupons(
        [FromServices] GharMitra.Application.Coupons.ICouponService coupons,
        CancellationToken ct)
        => Ok(await coupons.GetAllAsync(ct));

    [HttpPost("coupons")]
    public async Task<ActionResult<GharMitra.Application.Coupons.CouponDto>> CreateCoupon(
        GharMitra.Application.Coupons.CreateCouponRequest request,
        [FromServices] GharMitra.Application.Coupons.ICouponService coupons,
        CancellationToken ct)
    {
        try { return Ok(await coupons.CreateAsync(request, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
    [HttpGet("coupons/stats")]
    public async Task<ActionResult<GharMitra.Application.Coupons.CouponStatsDto>> GetCouponStats(
        [FromServices] GharMitra.Application.Coupons.ICouponService coupons,
        DateTime? fromUtc = null, DateTime? toUtc = null,
        CancellationToken ct = default)
        => Ok(await coupons.GetStatsAsync(fromUtc, toUtc, ct));

}