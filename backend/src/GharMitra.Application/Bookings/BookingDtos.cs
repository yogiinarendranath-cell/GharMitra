namespace GharMitra.Application.Bookings;

public record CreateBookingRequest(
    Guid ServiceId,
    DateTime ScheduledStartUtc,
    int DurationMinutes,
    string AddressLine,
    string City,
    string? Pincode,
    string? Notes);

public record CancelBookingRequest(string? Reason);

public record RescheduleBookingRequest(DateTime NewScheduledStartUtc);

public record BookingDto(
    Guid Id,
    string BookingNumber,
    string ServiceName,
    DateTime ScheduledStartUtc,
    int DurationMinutes,
    string AddressLine,
    string City,
    decimal TotalAmount,
    string Status,
    string PaymentStatus,
    string? ProfessionalName,
    double? ProfessionalLatitude = null,
    double? ProfessionalLongitude = null,
    decimal? RefundAmount = null,
    DateTime? RefundedAtUtc = null,
    string? RefundReason = null);

public record RefundResultDto(
    bool Success,
    decimal AmountRefunded,
    string Reason,
    string Message);

public record AssignBookingRequest(Guid ProfessionalId);

public record AdminProfessionalDto(Guid Id, string FullName, string City, bool IsVerified, bool IsAvailable, decimal Rating);