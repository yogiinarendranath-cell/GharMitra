using System.Security.Claims;
using GharMitra.Application.Bookings;
using GharMitra.Application.Coupons;
using GharMitra.Application.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize(Roles = "Customer")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookings;
    public BookingsController(IBookingService bookings) => _bookings = bookings;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ───── CORE BOOKING ENDPOINTS ─────

    [HttpPost]
    public async Task<ActionResult<BookingDto>> Create(CreateBookingRequest request, CancellationToken ct)
    {
        try { return Ok(await _bookings.CreateAsync(CurrentUserId, request, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("my")]
    public async Task<ActionResult<List<BookingDto>>> My(CancellationToken ct)
        => Ok(await _bookings.GetMyAsync(CurrentUserId, ct));

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<BookingDto>> Cancel(Guid id, CancelBookingRequest request, CancellationToken ct)
    {
        try { return Ok(await _bookings.CancelAsync(CurrentUserId, id, request.Reason, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ───── COUPON ENDPOINTS ─────

    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("coupon-attempts")]
    [HttpPost("{id:guid}/apply-coupon")]
    public async Task<ActionResult<CouponApplyResponse>> ApplyCoupon(
        Guid id,
        [FromBody] ApplyCouponRequest request,
        [FromServices] ICouponService coupons,
        CancellationToken ct)
    {
        try
        {
            var r = await coupons.ApplyToBookingAsync(CurrentUserId, id, request.Code, ct);
            return Ok(new CouponApplyResponse(r.Code, r.DiscountApplied, r.OriginalAmount, r.NewAmount));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{id:guid}/apply-coupon")]
    public async Task<IActionResult> RemoveCoupon(
        Guid id,
        [FromServices] ICouponService coupons,
        CancellationToken ct)
    {
        try { await coupons.RemoveFromBookingAsync(CurrentUserId, id, ct); return NoContent(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ───── PAYMENT ENDPOINTS ─────

    [HttpPost("{id:guid}/pay")]
    public async Task<ActionResult<PaymentOrderDto>> Pay(
        Guid id,
        [FromServices] IPaymentService payments,
        CancellationToken ct)
    {
        try
        {
            var result = await payments.CreateOrderAsync(CurrentUserId, id, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/verify-payment")]
    public async Task<IActionResult> VerifyPayment(
        Guid id,
        [FromBody] VerifyPaymentRequest request,
        [FromServices] IPaymentService payments,
        CancellationToken ct)
    {
        try
        {
            var verified = await payments.VerifyPaymentAsync(CurrentUserId, id, request, ct);
            return Ok(new { success = verified });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ───── REFUND ENDPOINT ─────

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
}

// ───── LOCAL REQUEST/RESPONSE RECORDS ─────
// Note: VerifyPaymentRequest is defined in GharMitra.Application.Payments
// (reused here, not duplicated)

public record RefundRequest(string Reason);

public record CouponApplyResponse(
    string CouponCode,
    decimal DiscountApplied,
    decimal OriginalAmount,
    decimal NewAmount);