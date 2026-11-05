using GharMitra.Application.Reviews;
using Microsoft.AspNetCore.Mvc;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/professionals")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviews;
    public ReviewsController(IReviewService reviews) => _reviews = reviews;

    [HttpGet("{professionalId:guid}/reviews")]
    public async Task<ActionResult<List<ReviewDto>>> GetReviews(Guid professionalId, CancellationToken ct)
        => Ok(await _reviews.GetReviewsForProfessionalAsync(professionalId, ct));
}