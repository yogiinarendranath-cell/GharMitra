using System.Security.Claims;
using GharMitra.Application.Bookings;
using GharMitra.Application.Payments;
using GharMitra.Application.Reviews;
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
    private readonly IReviewService _reviews;

    public BookingsController(IBookingService bookings, IPaymentService payments, IReviewService reviews)
    {
        _bookings = bookings;
        _payments = payments;
        _reviews = reviews;
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

    [HttpGet("{id:guid}/can-review")]
    public async Task<IActionResult> CanReview(Guid id, CancellationToken ct)
    {
        var canReview = await _reviews.CanReviewAsync(CurrentUserId, id, ct);
        return Ok(new { canReview });
    }

    [HttpPost("{id:guid}/reviews")]
    public async Task<ActionResult<ReviewDto>> SubmitReview(Guid id, CreateReviewRequest request, CancellationToken ct)
    {
        try { return Ok(await _reviews.SubmitReviewAsync(CurrentUserId, id, request, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}