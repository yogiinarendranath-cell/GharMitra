namespace GharMitra.Application.Reviews;

public interface IReviewService
{
    Task<ReviewDto> SubmitReviewAsync(Guid customerUserId, Guid bookingId, CreateReviewRequest request, CancellationToken ct = default);
    Task<List<ReviewDto>> GetReviewsForProfessionalAsync(Guid professionalId, CancellationToken ct = default);
    Task<bool> CanReviewAsync(Guid customerUserId, Guid bookingId, CancellationToken ct = default);
}