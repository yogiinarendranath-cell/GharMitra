using System.Security.Claims;
using GharMitra.Application.Bookings;
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
    private readonly IPaymentService _payments;

    public BookingsController(IBookingService bookings, IPaymentService payments)
    {
        _bookings = bookings;
        _payments = payments;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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

    [HttpPost("{id:guid}/pay")]
    public async Task<ActionResult<PaymentOrderDto>> Pay(Guid id, CancellationToken ct)
    {
        try { return Ok(await _payments.CreateOrderAsync(CurrentUserId, id, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/verify-payment")]
    public async Task<IActionResult> VerifyPayment(Guid id, VerifyPaymentRequest request, CancellationToken ct)
    {
        try 
        { 
            await _payments.VerifyPaymentAsync(CurrentUserId, id, request, ct);
            return Ok(new { message = "Payment verified successfully." });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}