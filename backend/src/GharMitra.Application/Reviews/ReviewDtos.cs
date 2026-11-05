namespace GharMitra.Application.Reviews;

public record CreateReviewRequest(int Rating, string? Comment);

public record ReviewDto(
    Guid Id,
    int Rating,
    string? Comment,
    string CustomerName,
    string? ProfessionalName,
    string ServiceName,
    DateTime CreatedAtUtc);