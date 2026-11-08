using System.Security.Claims;
using GharMitra.Application.Reviews;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GharMitra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/professionals")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviews;
    public ReviewsController(IReviewService reviews) => _reviews = reviews;

    [HttpGet("{professionalId:guid}/reviews")]
    public async Task<ActionResult<List<ReviewDto>>> GetReviews(Guid professionalId, CancellationToken ct)
        => Ok(await _reviews.GetReviewsForProfessionalAsync(professionalId, ct));
    [HttpGet("bookings/{bookingId:guid}/can-review")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<bool>> CanReview(Guid bookingId, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await _reviews.CanReviewAsync(userId, bookingId, ct));
    }

    [HttpPost("bookings/{bookingId:guid}/review")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<ReviewDto>> SubmitReview(Guid bookingId, [FromBody] CreateReviewRequest request, CancellationToken ct)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _reviews.SubmitReviewAsync(userId, bookingId, request, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

}