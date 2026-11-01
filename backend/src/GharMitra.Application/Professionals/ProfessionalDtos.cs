namespace GharMitra.Application.Professionals;

public record ProfessionalProfileDto(
    Guid Id, string FullName, string Email, string PhoneNumber,
    string City, bool IsVerified, bool IsAvailable, decimal Rating, int TotalJobs,
    DateTime? VerifiedAtUtc, string? VerificationNotes);

public record AssignmentDto(
    Guid Id, Guid BookingId, string BookingNumber,
    string ServiceName, string CustomerName, string CustomerPhone,
    string AddressLine, string City, string? Pincode, string? Notes,
    DateTime ScheduledStartUtc, int DurationMinutes, decimal TotalAmount,
    string BookingStatus, DateTime AssignedAtUtc, DateTime? AcceptedAtUtc);

public record VerifyProfessionalRequest(string? Notes);